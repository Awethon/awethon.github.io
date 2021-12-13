---
title: "Different ways to make AOP in Scala 2.x"
date: 2021-12-12T21:55:20+03:00
draft: false
tags: ["scala"]
---

Let's imagine that we have the trait that defines an interface for ItemDao:
{{< highlight scala >}}
trait ItemDao {
  def upsert(item: Item): Unit
  def get(id: Id): Option[Item]
}
{{< / highlight >}}

One of the possible ways to do AOP is trait mixins.
We just make a trait that calls parent implementation of a method, and then we write our code before and after it.

{{< highlight scala >}}
trait LoggedItemDaoAspect extends ItemDao with StrictLogging {
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

All we need to do is to connect it to our implementation:
{{< highlight scala >}}
new ItemDaoImpl(...) extends LoggedItemDaoAspect
{{< / highlight >}}

Things become messy if there are dependencies to provide.
Whenever we have an interface that returns scala.concurrent.Future we need to provide ExecutionContext in our aspects to be able to call map, flatMap, and other methods.

{{< highlight scala >}}
trait ItemDao {
  def upsert(item: Item): Future[Unit]
  def get(id: Id): Future[Option[Item]]
}

trait LoggedItemDaoAspect extends ItemDao with StrictLogging {
  protected implicit def ec: ExecutionContext

  abstract override def upsert(item: Item): Unit = {
    super.upsert(item).map(_ => logger.info(s"upsert($item) = ()"))
  }

  abstract override def get(id: Id): Option[Item] = {
    super.get(id).map(result => logger.info(s"get($id) = $result"))
  }
}

val itemDao: ItemDao =
  new ItemDaoImpl(...) extends LoggedItemDaoAspect {
    override def ec = yourEc
  }
{{< / highlight >}}

The initialization code is not as clear as before since we provide ExecutionContext through override mechanism, and now we need to keep in mind initialization order because it's easy to get NullPointerException there.
If we have Tagless Final in a code then we're doomed because different aspects will require different typeclass instances to be provided as function definitions.
Since we can't ask for a typeclass via context bounds we have to use the same mechanism as shown before.

Here's an example how TF code might look like:

{{< highlight scala >}}
trait LoggedItemDaoAspect[F[_]] extends ItemDao[F] with StrictLogging {
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
    extends LoggedItemDaoAspect[F]
    with MeteredItemDaoAspect[F]
    with TimeoutItemDaoAspect[F] {
      override def mt: MonadThrow[F] = async
      override def at: ApplicativeError[F] = async
      override def concurrent: Concurrent[F] = async
      override def timer: Timer[F] = _timer
      override def gauge: Gauge = methodCallGauge
  }
{{< / highlight >}}

In order to reduce the amount of boilerplate and to make sure function names are the same everywhere, we'd want to implement typeclass providers.

{{< highlight scala >}}
trait MonadThrowSupport[F[_]] extends ApplicativeThrowSupport[F] {
    implicit protected def mt: MonadThrow[F]

    override implicit protected def at: ApplicativeError[F] = mt
}

trait LoggingSupport[F[_]] extends MonadThrowSupport[F] with StrictLogging

trait LoggedItemDaoAspect[F[_]] extends ItemDao[F] with LoggingSupport[F] {
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
    extends LoggedItemDaoAspect[F]
    with MeteredItemDaoAspect[F]
    with TimeoutItemDaoAspect[F]
    with SuperProvider[F]
{{< / highlight >}}

As you can see every step we do with traits and Tagless Final the code only gets uglier.