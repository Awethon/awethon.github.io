---
title: "Different ways to make AOP in Scala 2.x"
date: 2021-12-21T21:55:20+03:00
draft: false
tags: ["scala"]
---

Let's imagine that we have a trait:
{{< highlight scala >}}
trait ItemDao {
    def upsert(item: Item): Unit

    def get(id: Id): Option[Item]
}
{{< / highlight >}}

One of the possible ways to do AOP are traits:

{{< highlight scala >}}
trait LoggedItemDaoAspect extends ItemDao with StrictLogging {
    abstract override def upsert(item: Item): Unit = {
        super.upsert(item)
        logger.info(s"upsert($item) = ()")
    }

    abstract override def get(id: Id): Option[Item] = {
        val result = super.get(id)
        logger.info(s"get($id) = $result")
    }
}
{{< / highlight >}}

Things become messy if there are dependencies to provide:

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

new ItemDaoImpl(...) extends LoggedItemDaoAspect {
    override def ec = yourEc
}

{{< / highlight >}}

If you use Tagless Final in your code then you're doomed because different aspects will require different typeclass instances to be provided as function definitions.

{{< highlight scala >}}
trait LoggedItemDaoAspect[F[_]] extends ItemDao with StrictLogging {
    implicit protected def mt: MonadThrow[F]

    abstract override def upsert(item: Item): Unit = {
        super.upsert(item).attemptTap(...)
    }

    abstract override def get(id: Id): Option[Item] = {
        super.get(id).attemptTap(...)
    }
}

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

In order to reduce amount of boilerplate and to make sure function names are the same everywhere you'd want to implement typeclass providers

{{< highlight scala >}}
trait MonadThrowSupport[F[_]] extends ApplicativeThrowSupport[F] {
    implicit protected def mt: MonadThrow[F]

    override implicit protected def at: ApplicativeError[F] = mt
}
{{< / highlight >}}

And then you'd want to make super-provider for everything.

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

new ItemDaoImpl[F](...)
    extends LoggedItemDaoAspect[F]
    with MeteredItemDaoAspect[F]
    with TimeoutItemDaoAspect[F]
    with SuperProvider[F]
{{< / highlight >}}

As you can see every step we do with traits and Tagless Final it gets only uglier.