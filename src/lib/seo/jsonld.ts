import type { Category } from '@/entities/category/model';
import type { CompanyProfile } from '@/entities/company/model';
import type { Product } from '@/entities/product/model';
import { canPublishOfferSchema, getProductSchemaAvailability } from '@/lib/catalog/quality';
import { absoluteUrl, siteConfig } from '@/lib/seo/config';
import type { BreadcrumbItem } from '@/lib/seo/breadcrumbs';

export function organizationJsonLd(company: CompanyProfile) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    '@id': absoluteUrl('/#organization'),
    name: company.name,
    url: absoluteUrl('/'),
    logo: absoluteUrl(company.logoUrl),
    telephone: company.phone,
    email: company.email || undefined,
    sameAs: company.sameAs,
  };
}

export function localBusinessJsonLd(company: CompanyProfile) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Store',
    '@id': absoluteUrl('/#local-business'),
    name: company.name,
    url: absoluteUrl('/'),
    telephone: company.phone,
    email: company.email || undefined,
    image: absoluteUrl(company.logoUrl),
    address: {
      '@type': 'PostalAddress',
      ...company.address,
    },
    geo: {
      '@type': 'GeoCoordinates',
      latitude: 51.54513,
      longitude: 46.020494,
    },
    areaServed: company.deliveryArea,
    openingHours: company.openingHours,
  };
}

export function websiteJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    '@id': absoluteUrl('/#website'),
    name: siteConfig.name,
    url: absoluteUrl('/'),
    inLanguage: 'ru-RU',
    potentialAction: {
      '@type': 'SearchAction',
      target: `${absoluteUrl('/search')}?q={search_term_string}`,
      'query-input': 'required name=search_term_string',
    },
  };
}

export function breadcrumbJsonLd(items: BreadcrumbItem[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: absoluteUrl(item.path),
    })),
  };
}

export function categoryJsonLd(category: Category) {
  return {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    '@id': absoluteUrl(`/catalog/${category.slug}#webpage`),
    name: category.h1,
    description: category.description,
    url: absoluteUrl(`/catalog/${category.slug}`),
    inLanguage: 'ru-RU',
  };
}

export function productJsonLd(product: Product) {
  const jsonLd: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    '@id': absoluteUrl(`/catalog/${product.categorySlug}/${product.slug}#product`),
    name: product.name,
    sku: product.sku,
    brand: { '@type': 'Brand', name: product.brandName },
    category: product.categorySlug,
    description: product.shortDescription,
    image: absoluteUrl(product.image),
    url: absoluteUrl(`/catalog/${product.categorySlug}/${product.slug}`),
  };

  if (canPublishOfferSchema(product) && product.price) {
    const offer: Record<string, unknown> = {
      '@type': 'Offer',
      price: product.price.amount,
      priceCurrency: product.price.currency,
      url: absoluteUrl(`/catalog/${product.categorySlug}/${product.slug}`),
      seller: { '@id': absoluteUrl('/#local-business') },
    };
    const availability = getProductSchemaAvailability(product);
    if (availability) offer.availability = availability;
    jsonLd.offers = offer;
  }

  return jsonLd;
}
