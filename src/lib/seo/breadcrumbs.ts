export type BreadcrumbItem = {
  name: string;
  path: string;
};

export function homeBreadcrumb(): BreadcrumbItem {
  return { name: 'Главная', path: '/' };
}
