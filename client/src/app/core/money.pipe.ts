import { Pipe, PipeTransform } from '@angular/core';

/** Formats an amount as "1,234.50 KM" (convertible mark, Bosnia and Herzegovina). */
@Pipe({ name: 'money' })
export class MoneyPipe implements PipeTransform {
  transform(value: number | null | undefined): string {
    const amount = (value ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    return `${amount} KM`;
  }
}
