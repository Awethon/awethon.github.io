---
title: "Different ways to implement wrappers in Scala"
date: 2022-02-20T21:55:20+03:00
modified: 2022-08-01T00:25:20+03:00
draft: false
tags: ["scala"]
---

The wrapper pattern (or the proxy pattern) is a useful way of adding extra logic to the methods of a class without changing it. It might be handy in scenarios where an application needs to be heavily instrumented and putting all the instrumentation in business logic will make code less readable. To be more specific, wrappers are useful for logging, metering, and tracing, but not limited to it. For example, it might be useful to set timeouts and retries in wrappers. However, transforming arguments or return value in a wrapper is considered to be an anti-pattern.  

Scala is a great language with many features and a complex type system. Thus, it provides many ways to create wrappers, but not all of them will fit well in your application.  

## Trait mixin

One of the possible ways to create a wrapper is the trait mixin and abstract override techniques. Scala has a sophisticated mechanism of dynamic class composition (inheritance, technically speaking) that allows to build a class from pieces (traits). While abstract override allows a trait to inherit another trait and to provide the implementation of a method that is able to call implementation from parent.  

{{< collapse2 `Mechanism explanation` >}}
  Sounds difficult but in fact it is easy to understand.
  {{< highlight scala >}}
  // Our interface
  trait Printer {
    def print(): Unit
  }

  // Sub-trait of Printer that overrides print
  // and makes a call of a parent class implementation
  // without any knowledge of what parent it is going to be.
  // Thus, `abstract` keyword is needed.
  trait PrinterButCooler extends Printer {
    abstract override def print(): Unit = {
      printf("Hello ")
      super.print()
      printf("!")
    }
  }

  // Implementation of Printer interface
  class PrinterImpl() extends Printer {
    override def print() = printf("World")
  }

  new PrinterImpl().print() // Output: World

  // PrinterImpl becomes a super-class for PrinterButCooler
  (new PrinterImpl() with PrinterButCooler).print() // Output: Hello World!
  {{< / highlight >}}
  
  Using this mechanism, it's possible to compose many trait mixins together, and that's exactly what we need for our wrappers.  
{{< / collapse2 >}}

Let's introduce a simple dao interface - ItemDao.
{{< highlight scala >}}
trait ItemDao {
  def upsert(item: Item): Unit
  def get(id: Id): Option[Item]
}
{{< / highlight >}}
\
As an example, we'll write logging of ItemDao methods, for that we need to create trait that extends ItemDao and override its methods with abstract modifier (see explanation above).
{{< highlight scala >}}
trait LoggedItemDaoWrapper extends ItemDao with StrictLogging {
  abstract override def upsert(item: Item): Unit = {
    logger.info(s"upsert($item) is called")
    super.upsert(item)
    logger.info(s"upsert($item) = ()")
  }

  abstract override def get(id: Id): Option[Item] = {
    logger.info(s"get($id) is called")
    val result = super.get(id)
    logger.info(s"get($id) = $result")
  }
}
{{< / highlight >}}
\
Then, we should initialize a class that implements ItemDao interface and add the wrapper we made into it.
{{< highlight scala >}}
new ItemDaoImpl(...) extends LoggedItemDaoWrapper
{{< / highlight >}}
\
So far it looks clean and seems easy to understand. Unfortunately, code is going to become messy if there are dependencies to provide.  
To show that, let's make our trait return `Future` values:
{{< highlight scala >}}
trait ItemDao {
  def upsert(item: Item): Future[Unit]
  def get(id: Id): Future[Option[Item]]
}
{{< / highlight >}}
\
If a trait has an interface that returns `Future`, then `ExecutionContext` must be provided to our wrappers to be able to call `map`, `flatMap`, and other methods.  
Many developers create global single thread execution context to keep things simple, but let's pretend I didn't say that.

{{< highlight scala >}}
trait LoggedItemDaoWrapper extends ItemDao with StrictLogging {
  protected implicit def ec: ExecutionContext

  abstract override def upsert(item: Item): Future[Unit] = {
    super.upsert(item).map(_ => logger.info(s"upsert($item) = ()"))
  }

  abstract override def get(id: Id): Future[Option[Item]] = {
    super.get(id).map(result => logger.info(s"get($id) = $result"))
  }
}

val itemDao: ItemDao =
  new ItemDaoImpl(...) extends LoggedItemDaoWrapper {
    override def ec = yourEc
  }
{{< / highlight >}}
\
The code of initialization is not as clear as before because `ExecutionContext` has to be provided through the `override def` mechanism. Initialization order has to be kept in mind because it's possible to get `NullPointerException` there.  
The more dependencies are stacked together the worse the code looks.

It becomes even worse with Tagless Final. When we write wrappers using TF we want to keep the granularity of type classes, but when it comes to initialization, we're doomed because different wrappers require different type class instances to be provided and we can only provide them by creating functions and overriding them in initialization code.

Here's an example of what TF code might look like:
{{< highlight scala >}}
trait ItemDao[F[_]] {
  def upsert(item: Item): F[Unit]
  def get(id: Id): F[Option[Item]]
}

trait LoggedItemDaoWrapper[F[_]] extends ItemDao[F] with StrictLogging {
  implicit protected def mt: MonadThrow[F]

  abstract override def upsert(item: Item): F[Unit] = {
    super.upsert(item).attemptTap(...)
  }

  abstract override def get(id: Id): F[Option[Item]] = {
    super.get(id).attemptTap(...)
  }
}

val itemDao: ItemDao[F] =
  new ItemDaoImpl[F](...)
    extends LoggedItemDaoWrapper[F]
    with MeteredItemDaoWrapper[F]
    with TimeoutItemDaoWrapper[F] {
      override def mt: MonadThrow[F] = async
      override def at: ApplicativeError[F] = async
      override def concurrent: Concurrent[F] = async
      override def timer: Timer[F] = _timer
      override def gauge: Gauge = methodCallGauge
    } 
{{< / highlight >}}
\
In order to reduce the amount of boilerplate and to make sure that the same dependencies have the same names, type class provider traits have to be implemented.
{{< highlight scala >}}
trait MonadThrowProvider[F[_]] extends ApplicativeThrowProvider[F] {
    implicit protected def mt: MonadThrow[F]

    override implicit protected def at: ApplicativeError[F] = mt
}

trait LoggingProvider[F[_]] extends MonadThrowProvider[F] with StrictLogging

trait LoggedItemDaoWrapper[F[_]] extends ItemDao[F] with LoggingProvider[F] {
  abstract override def upsert(item: Item): F[Unit] = {
    super.upsert(item).attemptTap(...)
  }

  abstract override def get(id: Id): F[Option[Item]] = {
    super.get(id).attemptTap(...)
  }
}
{{< / highlight >}}
\
Composing all providers into an all-in-one provider might be a good idea to reduce boilerplate in the initialization code.
{{< highlight scala >}}
trait AllInOneProvider[F[_]]
  extends MonadThrowProvider[F]
  with ConcurrentProvider[F]
  with TimerProvider[F]
  with ClockProvider[F]
  with PrometheusGaugeProvider {
    override def mt: MonadThrow[F] = async
    override def concurrent: Concurrent[F] = async
    override def timer: Timer[F] = _timer
    override def clock: Clock[F] = _clock
    override def gauge: Gauge = methodCallGauge
}

val itemDao: ItemDao[F] =
  new ItemDaoImpl[F](...)
    extends LoggedItemDaoWrapper[F]
    with MeteredItemDaoWrapper[F]
    with TimeoutItemDaoWrapper[F]
    with AllInOneProvider[F]
{{< / highlight >}}
\
We managed to hide all the ugly stuff behind AllInOneProvider trait and provider traits, but it's hard to reason about provided dependencies and their initialization.  
Initialization of components itself looks clean, but there's a strong feeling that Tagless Final went wrong and functional code shouldn't be written this way.

## Classic wrapper class

Writing a wrapper using a class is a standard way of doing it in OOP languages. The question is how well it is able to handle Tagless Final.  
Let's take a look at how would wrappers look with plain, `Future`, and `F[_]` values.
{{< highlight scala >}}
class LoggedItemDaoWrapper(itemDao: ItemDao)
  extends ItemDao with StrictLogging {
  
  override def upsert(item: Item): Unit = {
    logger.info(s"upsert($item) is called")
    itemDao.upsert(item)
    logger.info(s"upsert($item) = ()")
  }

  override def get(id: Id): Option[Item] = {
    logger.info(s"get($id) is called")
    val result = itemDao.get(id)
    logger.info(s"get($id) = $result")
  }
}

class LoggedItemDaoWrapper(itemDao: ItemDao)(implicit ec: ExecutionContext)
  extends ItemDao with StrictLogging {
  
  override def upsert(item: Item): Future[Unit] = {
    itemDao.upsert(item).map(_ => logger.info(s"upsert($item) = ()"))
  }

  override def get(id: Id): Future[Option[Item]] = {
    super.get(id).map(result => logger.info(s"get($id) = $result"))
  }
}

class LoggedItemDaoWrapper[F[_]: MonadThrow](itemDao: ItemDao[F])
  extends ItemDao[F] with StrictLogging {
  
  override def upsert(item: Item): F[Unit] = {
    itemDao.upsert(item).attemptTap(...)
  }

  override def get(id: Id): F[Option[Item]] = {
    itemDao.get(id).attemptTap(...)
  }
}
{{< / highlight >}}
\
Looks nice! Easy to read even with Tagless Final approach. But what about initialization?  
Well, having a constructor and implicit parameters reduces boilerplate significantly, composition instead of inheritance makes outcome easier to understand and control.

{{< highlight scala >}}
val itemDao: ItemDao[F] =
  new TimeoutItemDaoWrapper[F](timeoutsConfig)(
    new MeteredItemDaoWrapper[F](gauge)(
      new LoggedItemDaoWrapper[F](
        new ItemDaoImpl[F](...)
      )
    )
  )
{{< / highlight >}} 

### Syntactic sugar for class wrappers

Although initialization is in reverse order (compared to mixins) might be confusing.  
With the power of Scala implicits, it is pretty easy to make code look like trait mixins are being added to a class.

{{< highlight scala >}}
implicit class WrapperHelper[A](private val a: A) extends AnyVal {
  def `with`[B >: A](wrap: A => B): B = wrap(a)
}
{{< / highlight >}}

\
Adding `with` extension method is helpful if you have to migrate your code from trait mixins or prefer to have a code with direct wrapping order to avoid confusion.   
To achieve the best readability, make sure that wrappers have a companion with `apply` function with dependencies listed before to-be-wrapped class and that dependencies and class are separated with curring.
{{< highlight scala >}}
  class Wrapper[F[_]: TC1: TC2](dep1: Dep1, dep2: Dep2[F], o: MyClass[F]) extends MyClass[F] { ... }
  object Wrapper { def apply[F[_]: TC1: TC2](dep1: Dep1, dep2: Dep2[F])(o: MyClass[F]) = new Wrapper(dep1, dep2, o) }
{{< / highlight >}}
\
So initialization code will look like this:
{{< highlight scala >}}
myClassImpl
  .`with`(Wrapper1(dep1, dep2))
  .`with`(Wrapper2(dep3))
{{< / highlight >}}

## Tofu Mid

Tofu is a scala library made by Tagless Final enthusiasts that boosts TF experience to new levels. It has many features worth checking out, but the feature we need for wrappers is [Mid](https://docs.tofu.tf/docs/mid).

Mid is not an easy abstraction to understand. It is even harder to understand the deriving mechanism of type class `ApplyK`.  
Nevertheless, it doesn't make it hard to use. Mid is a function from the result of the original method to the result of the same type: `F[A] => F[A]`.

{{< highlight scala >}}
@derive(applyK)
trait ItemDao[F[_]] {
  def upsert(item: Item): F[Unit]
  def get(id: Id): F[Option[Item]]
}

class LoggingItemDaoWrapper[F[_]: Sync]
  extends ItemDao[Mid[F, *]] with StrictLogging {

  // Effectful logging. You might want to use Tofu Logging instead or just impure logging.
  private def info(str: String): F[Unit] = Sync[F].delay(logger.info(str))
  
  override def upsert(item: Item): Mid[F, Unit] = { upsert =>
    info(s"upserting $item") *> upsert <* info(s"upsert of $item is successful")
  }
  
  override def get(id: Id): Mid[F, Option[Item]] = { get =>
    info(s"getting $id") *> get.flatTap(result => info(s"get of $id is successful = $result"))
  }
}

class TimeoutItemDaoWrapper[F[_]: Concurrent](timeoutValue: FiniteDuration)
                                             (implicit timer: Timer[F]) extends ItemDao[Mid[F, *]] {

  override def upsert(item: Item): Mid[F, Unit] = _.timeout(timeoutValue)
  override def get(id: Id): Mid[F, Option[Item]] = _.timeout(timeoutValue)
}

class NoOpItemDaoWrapper[F[_]] extends ItemDao[Mid[F, *]] {

  override def upsert(item: Item): Mid[F, Unit] = identity
  override def get(id: Id): Mid[F, Option[Item]] = identity
}

val service  = new ItemDaoImpl[F](...)
val logging  = new LoggingItemDaoWrapper[F]
val timeouts = new TimeoutItemDaoWrapper[F](timeoutValue)
val noop     = new NoOpItemDaoWrapper[F]

// Execution order:
// logging before
// timeouts before
// noop before
// original method
// noop after
// timeouts after
// logging after
(logging |+| timeouts |+| noop).attach(service)

{{< / highlight >}}
\
As you can see code looks very clean without a need to pass arguments to the original method and make a call of it. While using `Mid` we're manipulating with  
But internal mechanism of Mid may not be clear.  

To put things simple, all the mid wrappers are composed like `mid2.andThen(mid1)` and method call chain in composite wrapper looks like `x => mid1.myMethod(mid2.myMethod(x))`, where x is an effect of the original `myMethod`, like `F[Option[Item]]` 
After composition, Mid wrapper attaches to implementation. 
Attachment means application of implementation to a wrapper and as a result it returns wrapped instance of a class:  `compositeMid.apply(impl)`.  
So basically, when you introduce a class with a type like `ItemDao[Mid[F, *]]`, you introduce a wrapper, because Mid effect is a  wrapper effect on type level.  

Unfortunately, Tofu Mid usability is limited to Tagless Final algebras due to `ApplyK` magic.

## Killer feature of inheritance-based wrapping (trait mixins)

The killer feature of inheritance-based wrappers is that inner calls of public methods are calling wrapped versions of methods. In case of composition-based wrappers, if public method is called inside implementation then unwrapped version of it will be called.  

Below, I wrote an example that will highlight described problem.

{{< collapse2 `Code example` >}}
{{< highlight scala >}}
trait Printer {
  def print(): Unit
  def threeTimesPrint(): Unit
}

trait LoggedPrinter extends Printer {
  abstract override def print(): Unit = {
    println("Print method is called")
    super.print()
  }
  
  abstract override def threeTimesPrint(): Unit = {
    println("ThreeTimesPrint method is called")
    super.threeTimesPrint()
  }
}

class LoggedPrinter2(printer: Printer) extends Printer {
  override def print(): Unit = {
    println("Print method is called")
    printer.print()
  }
  
  override def threeTimesPrint(): Unit = {
    println("ThreeTimesPrint method is called")
    printer.threeTimesPrint()
  }
}

class PrinterImpl() extends Printer {
  override def print() = println("A")
  override def threeTimesPrint() = 1.to(3).foreach(_ => print())
}

// Output:
// ThreeTimesPrint method is called
// Print method is called
// A
// Print method is called
// A
// Print method is called
// A
(new PrinterImpl() with LoggedPrinter).threeTimesPrint()

// Output:
// ThreeTimesPrint method is called
// A
// A
// A
(new LoggedPrinter2(new PrinterImpl())).threeTimesPrint()
{{< / highlight >}}
{{< / collapse2 >}}

## Pros and Cons

At the end of the article, it might seem that choice is clear, however after digging into details, many limitations and downsides are found.

### Trait mixin

Pros:  
**\+** Saves specific type after wrapping. `new ItemDaoImpl(...) extends LoggedItemDao` has type `ItemDaoImpl with LoggedItemDao`. So it is possible to use any methods from `ItemDaoImpl`.  
**\+** Only those methods that are to be wrapped need to be present in wrappers. If you have a trait with 10 methods but want to add logging to one of them, then only one abstract override of the method needs to be written in a mixin.  
**\+** Is able to do wrapped inner calls of public methods.
**\+** Doesn't require any libraries to use.  
**\+** Well explained in scala books.

Cons:  
**\-** Providing dependencies creates a lot of boilerplate.  
**\-** Wrapping uses an inheritance mechanism. The order of initialization may not be clear.  
**\-** Might lead to NPEs during initialization.  
**\-** Looks ugly with Tagless Final.

### Classic wrapper class

Pros:  
**\+** Easy-to-understand GOF pattern from OOP languages.  
**\+** Doesn't get complicated no matter how many wrappers are composed.  
**\+** It's possible to make initialization look like with mixins.  
**\+** Easy to use with Tagless Final.  
**\+** Doesn't require any libraries to use.

Cons:  
**\-** All the methods of a trait have to be overridden in a wrapper.  
**\-** StrictLogging gets wrapper class instead of implementation by default. It makes it hard to find the source of log in case where wrapper is used for many implementations.  
**\-** A wrapper loses implementation type after wrapping making it impossible to call methods specific to the implementation.
**\-** Is only able to unwrapped inner calls of public methods.

### Tofu Mid

Pros:  
**\+** No need to call an original method directly. Less boilerplate.  
**\+** Has DSL for initialization that is easy to use.

Cons:  
**\-** `ApplyK` cannot be derived if at least one of the methods returns anything other than `F[...]`. So it won't be derived if a trait has a constant method like `def groupId: String` or a method that returns `fs2.Stream`.  
**\-** `Mid` usage is limited to TF algebras and only to them.
**\-** The annotation that derives `ApplyK` has to be added to a class or has to be derived manually.
**\-** One type parameter type has to be introduced to do initialization. It won't work automatically with type `KVDao[F[_], K, V]` or similar.  
**\-** All the methods of a trait have to be overridden in a wrapper. It's much easier with `Mid` than with classic wrappers. Just use `x => x` or in other words `identity` is enough.  
**\-** The same problem with StrictLogging as for classic wrapper class. Tofu provides Logging type class but its implementation is too specific.  
**\-** A class that is wrapped with `Mid` wrapper loses original implementation type (the same as classic wrapper). Methods that are available only in implementation are unavailable after wrapping. 
**\-** Is only able to unwrapped inner calls of public methods.


## Conclusion

Although usage of `Mid` reduces boilerplate in wrappers it adds boilerplate in `ApplyK` derivation and temporary one type parameter introduction cases.  
The usability of Mid is very limited and cannot be used as a universal wrapping approach unless you have an ideal Tagless Final application which is a rare thing in reality.

I'd recommend using classic wrapper classes as it is a readable and easy-to-understand solution, but unabilty to call wrapped methods inside implementation might be a huge downside sometimes.
