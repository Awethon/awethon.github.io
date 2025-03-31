---
title: "Different ways to implement wrappers in Scala"
date: 2022-02-20T21:55:20+03:00
modified: 2024-10-18T23:43:11+03:00
draft: false
tags: ["scala"]
---

Scala is a great language with many features and a complex type system.
It provides many ways to solve the same problem, but each way has its own pros and cons.
Unfortunately, it's a common problem of scala developers to utilize the features of Scala, disregarding the cognitive load that it might bring to the team. \
In this article, I'll try to advocate for a simple and easy-to-understand way of implementing wrappers in Scala.

But what are these wrappers and what are they good for? \
The wrapper pattern (or the proxy pattern) is a design pattern that allows to add new functionality to an existing class without altering it. 
It is useful in scenarios where an application needs to be instrumented, meaning it needs to be monitored, metered, and traced. 
Putting all the instrumentation in business logic will make code less readable by mixing business logic with monitoring code. 
And that's where wrappers shine. However, they can be used for other purposes as well (like timeouts and retries). \
(NB: transforming an argument or a return value in a wrapper is considered to be an anti-pattern.)

There are two main ways to implement wrappers in Scala: using trait mixins and using classic wrapper classes.
In previous edition this article covered a third way of implementing wrappers in Scala using `Mid` type class from `tofu` library. But it had many disadvantages and `tofu` is not maintained anymore. So, I decided to remove it from the article.
For some reason trait mixins were widely used in Scala community and in the past using mixins was considered to be "The Scala Way". And I still see developers using them.
However, I don't think that using mixins is a good idea in most cases. I'll try to explain why in this article.

## Trait mixin

One of the possible ways to create a wrapper is using the trait mixin and abstract override techniques. 
Scala has a sophisticated mechanism of dynamic class composition (inheritance, technically speaking) that allows to build a class from pieces (traits). 
While abstract override allows a trait to extend another trait and to provide the implementation of a method in the way that it will be able to call the implementation from its parent.  

{{< collapse2 `Mechanism explanation` >}}
  I know that the description above might sound like gibberish, so let me explain it with an example.
  {{< highlight scala >}}
  // Our interface
  trait Printer {
    def print(): Unit
  }

  // A trait that extends Printer and overrides print
  // in the way that it makes a call to a parent class in its implementation
  // without any knowledge of what parent it is going to be.
  // And because there's no parent known, `abstract` keyword is needed.
  trait PrinterButCooler extends Printer {
    abstract override def print(): Unit = {
      printf("Hello ")
      super.print()
      printf("!")
    }
  }

  // The actual implementation of Printer trait
  class PrinterImpl() extends Printer {
    override def print() = printf("World")
  }

  new PrinterImpl().print() // Output: World

  // Now, to add additional functionality to PrinterImpl
  // we instantiate PrinterImpl and mix it with PrinterButCooler
  // but at the same time the class PrinterImpl is not aware of PrinterButCooler
  // as it's only added at the moment of instantiation.
  (new PrinterImpl() with PrinterButCooler).print() // Output: Hello World!

  // Using this mechanism, it's possible to compose an implementation with many trait mixins,
  // but the order of mixins is important as it defines the order of method calls.
  _
  {{< / highlight >}}
{{< / collapse2 >}}

Let's introduce a simple trait - ItemDao.
{{< highlight scala >}}
trait ItemDao {
  def upsert(item: Item): Unit
  def get(id: Id): Option[Item]
}
{{< / highlight >}}
\
As an example, we'll implement mixins for ItemDao logging. To do that we need to create a trait that extends ItemDao and override its methods with abstract modifier (see an explanation in "Mechanism explanation" section).
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
So far it looks clean and seems easy to understand.
You might be even eager to try it in your project, but unfortunately, it's not that simple. 
Code is going to become messy if there are dependencies to provide. \
To show that, let's make our trait return `Future` values:
{{< highlight scala >}}
trait ItemDao {
  def upsert(item: Item): Future[Unit]
  def get(id: Id): Future[Option[Item]]
}
{{< / highlight >}}
\
If a trait has methods that return `Future`, then an `ExecutionContext` must be provided. Otherwise, we won't be able to call `map`, `flatMap`, and other methods of `Future` in the logic of our wrappers.  
The most common workaround for this I have seen is to create a global single thread execution context. But what if it's not an option? Then we have to provide `ExecutionContext` through the `override def` mechanism.

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
The code of initialization is not as clear as before because `ExecutionContext` has to be provided through the `override def` mechanism. 
An initialization order has to be kept in mind as it's possible to get `NullPointerException`.  
The more dependencies are stacked together the worse it gets.

It becomes even worse with Tagless Final. \
When we write our wrappers with TF in a project, we can't do much with `F[_]` unless we have instances of typeclasses in a scope together with it.
It would be reasonable to assume that each wrapper works with different set of type classes. 
So, when it comes to initialization, we're doomed because now we need to provide all the dependencies for each wrapper.

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
Does it look ugly to you? It does to me. However, I would lie if I said there's nothing we can do about it. \
The workaround we can apply to reduce the amount of boilerplate, is to create provider traits that will provide all the necessary dependencies for wrappers.

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
As we're already in this rabbit hole of blasphemy, we can go even further.
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

// now with all-in-one provider the initialization code is quite clean
val itemDao: ItemDao[F] =
  new ItemDaoImpl[F](...)
    extends LoggedItemDaoWrapper[F]
    with MeteredItemDaoWrapper[F]
    with TimeoutItemDaoWrapper[F]
    with AllInOneProvider[F]
{{< / highlight >}}
\
Finally, we have managed to hide all the ugly stuff behind AllInOneProvider trait and provider traits, but it's hard to track the provided dependencies and their initialization.  
Yes, it looks clean, but the code now smells even more. As this dependency provision is very exotic and completely unmaintainable.
Not only that but such encoding of dependencies is very unnatural for Tagless Final and functional programming in general.

## Classic wrapper class

Who would have thought that the classic way of doing things is the best way?
The way that was designed for OOP languages works incredibly well in Scala with both Tagless Final and Scala Future.
But I'm getting ahead of myself. Let's introduce the same logging wrapper but using a classic wrapper class.
And let's do it for plain values, then for `Future` and finally for `F[_]`.


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
Looks nice! Easy to read and everything looks as idiomatic as it gets. But what about initialization?  
Well, having constructor parameters and implicit parameters reduces boilerplate significantly.
With composition instead of inheritance we can easily wrap our implementation with as many wrappers as we want.
It's now clear which dependencies are used and to where they are passed.

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

OOP wrappers make code look nice and tidy, but there are a few minor inconveniences.
We wrap our implementation with wrappers and wrapper names now appear from the outermost wrapper to the innermost one.
The other inconvinience is that we get nested code with probably the beefiest initialization code (`ItemDaoImpl`) in the innermost part.

With the power of Scala implicits, it is pretty easy to solve these issues.

{{< highlight scala >}}
implicit class WrapperHelper[A](private val a: A) extends AnyVal {
  def `with`[B >: A](wrap: A => B): B = wrap(a)
}
{{< / highlight >}}

\
 
To achieve the best readability, we should add a companion object with `apply` function to our wrappers and have dependencies listed before to-be-wrapped class.
On top of that we should separate dependencies and an implementation class with curring.
Like this:
{{< highlight scala >}}
  class Wrapper[F[_]: TC1: TC2](dep1: Dep1, dep2: Dep2[F], o: MyClass[F]) extends MyClass[F] { ... }
  object Wrapper { def apply[F[_]: TC1: TC2](dep1: Dep1, dep2: Dep2[F])(o: MyClass[F]) = new Wrapper(dep1, dep2, o) }
{{< / highlight >}}
\
So the initialization code will look like this:
{{< highlight scala >}}
myClassImpl
  .`with`(Wrapper1(dep1, dep2))
  .`with`(Wrapper2(dep3))
{{< / highlight >}}

## Crucial distinction between inheritance-based wrapping (trait mixins) and composition-based wrapping (classic wrapper class)

This distinction can be both very useful and very harmful, depending on the use case.
The fact of the matter is that inheritance-based wrapping is able to call wrapped methods inside the implementation, while composition-based wrapping is not able to do so.
So if you have an implementation that calls its own public methods inside, then with inheritance-based wrapping these internal calls will be wrapped as well.

Below, I wrote an example that will highlight described distinction.

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
**\+** Preserves implementation type after wrapping. `new ItemDaoImpl(...) extends LoggedItemDao` has type `ItemDaoImpl with LoggedItemDao`. So it is possible to use any methods from `ItemDaoImpl`.  
**\+** With mixin traits it's possible omit the methods that don't need modification of their behavior. If we have a trait with 10 methods but want to add logging to one of them, then only one abstract override of the method needs to be written in a mixin.  
**\+** Wrapped version of a method is invoked on an inner call.

Cons:  
**\-** Providing dependencies creates a lot of boilerplate.  
**\-** Wrapping uses an inheritance mechanism. The order of initialization may not be clear.  
**\-** Might lead to NPEs during initialization.  
**\-** Looks ugly with Tagless Final.  
**\-** Scala compiler doesn't provide any warnings or errors if a method is not overridden in a wrapper.  
**\-** Wrapped version of a method is invoked on an inner call. (Might be a downside in some cases)

### Classic wrapper class

Pros:  
**\+** Easy-to-understand GOF pattern from OOP languages.  
**\+** Doesn't get complicated no matter how many wrappers are composed.  
**\+** It's possible to simplify initialization even more with syntactic sugar.  
**\+** Easy to use with Tagless Final.  
**\+** Scala compiler provides errors if a method is not overridden in a wrapper.  
**\+** When public method is called in an implementation internally, then none of the wrappers will be used.

Cons:  
  **\-** All the methods of a trait have to be overridden in a wrapper.  
  **\-** StrictLogging gets wrapper class instead of implementation by default.  
  **\-** A wrapper loses implementation type after wrapping making it impossible to call methods specific to the implementation.  
  **\-** When public method is called in an implementation internally, then none of the wrappers will be used.  

## Conclusion

In my experience, the classic wrapper classes are the way to go. 
They are easy to understand, easy to use, and easy to maintain.
I'm yet to see a case where it's not the best choice.
