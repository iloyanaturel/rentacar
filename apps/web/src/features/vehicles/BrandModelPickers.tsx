'use client';

import {
  Controller,
  useWatch,
  type Control,
  type FieldValues,
  type Path,
} from 'react-hook-form';
import { Combobox } from '@/components/ui/Combobox';
import { brandOptions, modelOptions } from '@/data/carCatalog';

export function BrandModelPickers<T extends FieldValues>({
  control,
  brandError,
  modelError,
  onBrandChange,
}: {
  control: Control<T>;
  brandError?: string;
  modelError?: string;
  onBrandChange?: () => void;
}) {
  const brand = (useWatch({ control, name: 'brand' as Path<T> }) as string) ?? '';

  return (
    <>
      <Controller
        control={control}
        name={'brand' as Path<T>}
        render={({ field }) => (
          <Combobox
            label="Marka"
            value={(field.value as string) ?? ''}
            options={brandOptions()}
            placeholder="Marka seçin"
            searchPlaceholder="Marka ara…"
            error={brandError}
            allowCustom
            customLabel="Listede yok, yine de kullan"
            onChange={(value) => {
              field.onChange(value);
              onBrandChange?.();
            }}
          />
        )}
      />
      <Controller
        control={control}
        name={'model' as Path<T>}
        render={({ field }) => (
          <Combobox
            label="Model"
            value={(field.value as string) ?? ''}
            options={modelOptions(brand)}
            placeholder={brand ? 'Model seçin' : 'Önce marka seçin'}
            searchPlaceholder="Model ara…"
            error={modelError}
            disabled={!brand}
            allowCustom
            customLabel="Listede yok, yine de kullan"
            emptyText={
              brand
                ? 'Bu marka için model bulunamadı — özel değer girebilirsiniz'
                : 'Önce marka seçin'
            }
            onChange={field.onChange}
          />
        )}
      />
    </>
  );
}
