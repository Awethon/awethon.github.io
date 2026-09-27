import rss from '@astrojs/rss'
import type { APIContext } from 'astro'
import { allPosts, postHref } from '../lib/posts'

export async function GET(context: APIContext) {
  const posts = await allPosts()
  return rss({
    title: "Awethon's Page",
    description: 'Scala, JVM tooling and type systems.',
    site: context.site!,
    items: posts.map((post) => ({
      title: post.data.title,
      pubDate: post.data.date,
      description: post.data.summary,
      link: postHref(post),
    })),
  })
}
