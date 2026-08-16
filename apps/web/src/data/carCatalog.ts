import catalog from '@/data/car-catalog.json';

export type CarBrand = {
  name: string;
  models: string[];
};

const brands = catalog.brands as CarBrand[];

export function getCarBrands(): string[] {
  return brands.map((b) => b.name);
}

export function getModelsForBrand(brand: string): string[] {
  if (!brand) return [];
  const exact = brands.find(
    (b) => b.name.toLocaleLowerCase('tr') === brand.toLocaleLowerCase('tr'),
  );
  if (exact) return exact.models;
  const fuzzy = brands.find((b) =>
    b.name.toLocaleLowerCase('tr').includes(brand.toLocaleLowerCase('tr')),
  );
  return fuzzy?.models ?? [];
}

export function brandOptions() {
  return getCarBrands().map((name) => ({ value: name, label: name }));
}

export function modelOptions(brand: string) {
  return getModelsForBrand(brand).map((name) => ({
    value: name,
    label: name,
  }));
}

export const carCatalogMeta = {
  source: catalog.source as string,
  fetchedAt: catalog.fetched_at as string,
  brandCount: brands.length,
};
