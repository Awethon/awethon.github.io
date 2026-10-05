import { getCollection, type CollectionEntry } from 'astro:content'

export type Section = 'posts' | 'life'
export type Post = CollectionEntry<Section>

export const readingMinutes = (body: string | undefined) =>
  Math.max(1, Math.round((body ?? '').trim().split(/\s+/).length / 220))

export const postHref = (post: Post) => `/${post.collection}/${post.id}/`

export const allPosts = async (section: Section = 'posts') => {
  const posts: Post[] = await getCollection(section, ({ data }) => !data.draft)
  return posts.sort((a, b) => b.data.date.getTime() - a.data.date.getTime())
}

export const allTags = async () => {
  const posts = await allPosts()
  const counts = new Map<string, number>()
  for (const post of posts) {
    for (const tag of post.data.tags) {
      counts.set(tag, (counts.get(tag) ?? 0) + 1)
    }
  }
  return [...counts.entries()]
    .map(([tag, count]) => ({ tag, count, slug: tag.toLowerCase().replace(/\s+/g, '-') }))
    .sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag))
}
