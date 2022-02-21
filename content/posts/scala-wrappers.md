---
title: "Different ways to implement wrappers in Scala 2.x"
date: 2022-02-20T21:55:20+03:00
draft: false
tags: ["scala"]
---

The wrapper pattern is useful for adding extra logic to methods of a class: logging, metering, tracing, timeouts, retries. It helps to keep code clean and focused on business logic.  
Scala is a great language and provides many ways to create wrappers. Maybe even too many.

I decided to create this article because it seems that there's no consensus among Scala developers on how to write them and no clear understanding of downsides and limitations.

{{< table_of_contents >}}

## Trait mixin

One of the possible ways to create a wrapper is the trait mixin technique.

Let's introduce a simple trait to start with:
{{< highlight scala >}}
trait ItemDao {
  def upsert(item: Item): Unit
  def get(id: Id): Option[Item]
}
{{< / highlight >}}

To write a mixin wrapper for ItemDao we need to create the trait that extends ItemDao interface and make an abstract override to change methods behavior.  
It's important not to forget to call parent implementation of a method.

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

To make it work mixin wrapper should be mixed into implementation:
{{< highlight scala >}}
new ItemDaoImpl(...) extends LoggedItemDaoWrapper
{{< / highlight >}}

So far it looks nice and seems easy to understand.  
Unfortunately, things become messy if there are dependencies to provide.

Let's make our trait to have asynchronous interface:
{{< highlight scala >}}
trait ItemDao {
  def upsert(item: Item): Future[Unit]
  def get(id: Id): Future[Option[Item]]
}
{{< / highlight >}}
\
If a trait has an interface that returns `scala.concurrent.Future`, then ExecutionContext must be provided to our wrappers to be able to call `map`, `flatMap`, and other methods.  
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
{{< / highlight >}}

{{< highlight scala >}}
val itemDao: ItemDao =
  new ItemDaoImpl(...) extends LoggedItemDaoWrapper {
    override def ec = yourEc
  }
{{< / highlight >}}
\
The code of initialization is not as clear as before because `ExecutionContext` has to be provided through the `override def` mechanism. Initialization order has to be kept in mind because it's possible to get `NullPointerException` there.  
The more dependencies are stacked together the worse the code looks.

It becomes even worse with Tagless Final. When we write wrappers using TF we want to keep granularity of type classes, but when it comes to initialization, we're doomed because different wrappers require different type class instances to be provided as function definitions. Since a type class cannot be provided via context bounds, we have to use the same mechanism as shown before.

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
In order to reduce the amount of boilerplate and make sure dependency names are the same for the same dependencies, type class provider traits have to be implemented.

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

The composition of all providers into a super-provider might be a good idea to reduce boilerplate in the initialization code.

{{< highlight scala >}}
trait SuperProvider[F[_]]
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
    with SuperProvider[F]
{{< / highlight >}}
\
We managed to hide all the ugly stuff behind SuperProvider trait and provider traits, but it's hard to reason about provided dependencies and their initialization.  
Initialization of components themselves looks clean, but there's a strong feeling that Tagless Final went wrong and code shouldn't be written this way.

## Classic wrapper class

Writing a wrapper via class is a standard way of doing it in OOP languages. The question is how well it is able to handle Tagless Final.  
I'll write all three versions together since they look very similar:
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
Well, implicits reduce boilerplate significantly, composition instead of inheritance makes dependencies easy to reason about.

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
\
Although initialization is in reverse order (compared to traits) might be confusing.  
With the power of Scala implicits, it is pretty easy to make code look like mixins are being added to a class.

{{< highlight scala >}}
implicit class WrapperHelper[A](private val a: A) extends AnyVal {
  def `with`[B >: A](wrap: A => B): B = wrap(a)
}
{{< / highlight >}}
\
I think it's a great and simple solution that helps to migrate from mixins smoothly.
To achieve the best result, make sure that wrappers have a companion with `apply` function with dependencies listed before to-be-wrapped class and that dependencies and class are separated with curring e.g.
{{< highlight scala >}}
  class Wrapper[F[_]: TC1: TC2](dep1: Dep1, dep2: Dep2[F])(o: MyClass[F]) extends MyClass[F] { ... }
{{< / highlight >}}
\
So initialization code will look like this:
{{< highlight scala >}}
myClassImpl
  .`with`(Wrapper1(dep1, dep2))
  .`with`(Wrapper2(dep3))
{{< / highlight >}}

## Tofu Mid

Tofu is a scala library made by Tagless Final enthusiasts that boosts TF experience to new levels. It has many features worth checking out but the feature we need for wrappers is [Mid](https://docs.tofu.tf/docs/mid).

Mid is not an easy abstraction to understand. It is even harder to understand the deriving mechanism of type class `ApplyK`.  
Nevertheless, it doesn't make it hard to use.

## Pros and Cons

At the end of the article, it might seem that choice is clear, however after digging into details, many limitations and downsides are found.

### Trait mixin

Pros:  
**\+** Saves specific type after wrapping. `new ItemDaoImpl(...) extends LoggedItemDao` has type `ItemDaoImpl with LoggedItemDao`. So it is possible to use any methods from `ItemDaoImpl`.  
**\+** Only those methods that are to be wrapped need to be present in wrappers. If you have a trait with 10 methods but want to add logging to one of them, then only one abstract override of the method needs to be written in a mixin.  
**\+** Doesn't require any libraries to use.  
**\+** Well explained in scala books.

Cons:  
**\-** Providing dependencies creates a lot of boilerplate.  
**\-** Wrapping uses an inheritance mechanism. The order of initialization may not be clear.  
**\-** Might lead to NPEs during initialization.  
**\-** Looks ugly with Tagless Final.

### Classic wrapper class

Pros:  
**\+** Easy to understand GOF pattern from OOP languages.  
**\+** Doesn't get complicated no matter how many wrappers are composed.  
**\+** It's possible to make initialization look like with mixins.  
**\+** Easy to use with Tagless Final.  
**\+** Doesn't require any libraries to use.

Cons:  
**\-** All the methods of a trait have to be overridden in a wrapper.
**\-** It's possible to compile code with super.method() instead of x.method().  
**\-** StrictLogging gets wrapper class instead of implementation by default. It makes it hard to find the source of log in case where wrapper is used for many implementations.  
**\-** A wrapper loses implementation type after wrapping making it impossible to call methods specific to the implementation.

### Tofu Mid

Pros:  
**\+** No need to call an original method directly. Less boilerplate.  
**\+** Has dsl for initialization that is easy to use.

Cons:  
**\-** It's possible to compile code with super.method().  
**\-** The same problem with StrictLogging as for classic wrapper class. Tofu provides Logging type class but its implementation is too specific.  
**\-** Mid wrapper also loses original type.  
**\-** Even though all the methods of a trait have to be overridden, it's much easier with mid. `x => x` or in other words `identity` is enough.  
**\-** One type parameter type has to be introduced to do initialization. It won't work automatically with type KVDao[F[_], K, V] or similar.  
**\-** The annotation that derives ApplyK has to be added to a class or has to be derived manually.  
**\-** ApplyK cannot be derived if at least one of the methods returns anything other than F[...]. So it won't be derived if a trait has a constant method like `def groupId: String` or a method that returns fs2.Stream.  
**\-** Mid usage is limited to TF algebras and only to them.

## Conclusion

Although usage of Mid reduces boilerplate in wrappers it adds boilerplate in `ApplyK` derivation and temporary one type parameter introduction cases.  
Usage of Mid is very limited and cannot be used as a universal wrapping approach unless you have an ideal Tagless Final application which is a rare thing in reality.

I would personally recommend using classic wrapper classes.
