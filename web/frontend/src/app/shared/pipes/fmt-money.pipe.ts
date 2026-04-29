import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'fmtMoney',
  standalone: true,
})
export class FmtMoneyPipe implements PipeTransform {
  transform(value: number | string | null | undefined): string {
    return `Gs. ${new Intl.NumberFormat('es-PY', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(Number(value) || 0)}`;
  }
}
