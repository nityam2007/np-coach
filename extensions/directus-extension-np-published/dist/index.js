const PUBLISHABLE_COLLECTIONS = new Set([
  "services",
  "fleet",
  "pages",
  "tours",
  "routes",
  "stops",
  "school_routes",
  "blog_posts",
  "testimonials",
]);

const PUBLIC_FILE_FIELDS = new Set([
  "id",
  "title",
  "type",
  "width",
  "height",
  "description",
  "modified_on",
]);

function isAnonymous(collection, accountability) {
  return PUBLISHABLE_COLLECTIONS.has(collection) && !accountability?.user;
}

const publishedContentHook = ({ filter }) => {
  filter("items.query", (query, { collection }, { accountability }) => {
    if (!isAnonymous(collection, accountability)) return query;

    const published = { status: { _eq: "published" } };
    const current = query?.filter;
    return {
      ...query,
      filter: current && Object.keys(current).length
        ? { _and: [published, current] }
        : published,
    };
  });

  filter("items.read", (items, { collection }, { accountability }) => {
    if (!isAnonymous(collection, accountability)) return items;
    if (Array.isArray(items)) return items.filter((item) => item?.status === "published");
    return items?.status === "published" ? items : null;
  });

  filter("files.read", (items, _meta, { accountability }) => {
    if (!accountability || accountability.user) return items;
    const sanitize = (item) => Object.fromEntries(
      Object.entries(item ?? {}).filter(([field]) => PUBLIC_FILE_FIELDS.has(field)),
    );
    return Array.isArray(items) ? items.map(sanitize) : sanitize(items);
  });
};

export default publishedContentHook;
