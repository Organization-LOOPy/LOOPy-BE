export const parseFiltersFromQuery = (filterString) => {
  if (!filterString) return {};

  return filterString.split(",").reduce((acc, item) => {
    const trimmed = item.trim();
    if (trimmed) {
      acc[trimmed] = true;
    }
    return acc;
  }, {});
};
