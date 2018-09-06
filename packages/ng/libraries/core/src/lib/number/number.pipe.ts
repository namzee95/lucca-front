import { Pipe, PipeTransform, Inject, LOCALE_ID } from '@angular/core';
import { formatNumber, getLocaleNumberSymbol, NumberSymbol } from '@angular/common';

@Pipe({
	name: 'luNumber',
	pure: true,
})
export class LuNumberPipe implements PipeTransform {
	constructor(@Inject(LOCALE_ID) protected locale) {}
	transform(number: number) {
		const formatted = formatNumber(number, this.locale, '1.2-2');
		const separator = getLocaleNumberSymbol(this.locale, NumberSymbol.Decimal);
		const split = formatted.split(separator);
		const integral = split[0];
		const decimal = split[1];
		const hideDecimal = Math.round(number) === number;
		return `${integral}<span class="decimal-part${hideDecimal ? ' u-hidden' : ''}">${separator}${decimal}</span>`;
	}
}
