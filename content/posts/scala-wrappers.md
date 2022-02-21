---
title: "Different ways to make wrappers in Scala 2.x"
date: 2022-02-20T21:55:20+03:00
draft: false
tags: ["scala"]
---

I made this article to overview different approaches to make wrappers in Scala.
Wrapper pattern is useful to add additional logic to methods of a class: logging, metering, tracing, timeouts, retries. 
Scala is a great language and provides many ways to create wrappers.
I decided to create this article because it seems that there's no consensus between Scala developers on how to write them and no clear understanding of downsides and limitations.

I'm going to review the following ways: trait mixin, class wrapper, and tofu mid.

Let's introduce a simple trait to start with:
{{< highlight scala >}}
trait ItemDao {
  def upsert(item: Item): Unit
  def get(id: Id): Option[Item]
}
{{< / highlight >}}

One of the possible ways to create a wrapper is trait mixin technique.
We just need to make a trait that calls parent implementation of a method, and write our code.

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

To make it work all we need to do is to connect it to our implementation:
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

If we have an interface that returns scala.concurrent.Future, then we have to provide ExecutionContext to our wrappers to be able to call map, flatMap, and other methods.
Many developers create global single thread execution context to keep things simple, but let's pretend I didn't say that.

{{< highlight scala >}}
trait LoggedItemDaoWrapper extends ItemDao with StrictLogging {
  protected implicit def ec: ExecutionContext

  abstract override def upsert(item: Item): Unit = {
    super.upsert(item).map(_ => logger.info(s"upsert($item) = ()"))
  }

  abstract override def get(id: Id): Option[Item] = {
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

The initialization code is not as clear as before since we provide ExecutionContext through override mechanism, and now we need to keep in mind initialization order because it's easy to get NullPointerException there.
Initialization gets uglier if we have many wrappers for a class with different dependencies.

It can become even worse if we have Tagless Final.
When we write wrappers with TF we have to keep granularity of type classes, but when it comes to initialization, we're doomed because different wrappers require different type class instances to be provided as function definitions.
Since we can't ask for a type class via context bounds we have to use the same mechanism as shown before.

Here's an example how TF code might look like:

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

In order to reduce the amount of boilerplate and to make sure function names are the same everywhere, we'd want to implement type class providers.

{{< highlight scala >}}
trait MonadThrowSupport[F[_]] extends ApplicativeThrowSupport[F] {
    implicit protected def mt: MonadThrow[F]

    override implicit protected def at: ApplicativeError[F] = mt
}

trait LoggingSupport[F[_]] extends MonadThrowSupport[F] with StrictLogging

trait LoggedItemDaoWrapper[F[_]] extends ItemDao[F] with LoggingSupport[F] {
  abstract override def upsert(item: Item): F[Unit] = {
    super.upsert(item).attemptTap(...)
  }

  abstract override def get(id: Id): F[Option[Item]] = {
    super.get(id).attemptTap(...)
  }
}
{{< / highlight >}}

And then we'd want to make a super-provider for everything to reduce boilerplate in initialization code.

{{< highlight scala >}}
trait SuperProvider[F[_]]
  extends MonadThrowSupport[F]
  with ConcurrentSupport[F]
  with TimerSupport[F]
  with ClockSupport[F]
  with PrometheusGaugeSupport {
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

We managed to hide all the ugly stuff behind SuperProvider trait and support traits, but it's hard to reason about provided dependencies and their initialization.
Initialization of components themselves looks clean but there's a strong feeling that Tagless Final went wrong and code shouldn't be written this way.
