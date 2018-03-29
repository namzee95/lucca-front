import {
	Component,
	forwardRef,
	Renderer2,
	ElementRef,
	Input,
} from '@angular/core';
import {
	NgModel,
	NG_VALUE_ACCESSOR,
	NG_VALIDATORS,
} from '@angular/forms';
import {
	LuSelect,
} from '../select.component';
import { ISelectApiFeeder } from './feeder';
import {IApiItem} from '../../api/api.model';
/**
 * User select
 *
*/
@Component({
	// tslint:disable-next-line:component-selector
	selector: 'select-api',
	templateUrl: './select-api.component.html',
	styleUrls: ['./select-api.component.scss'],
	providers: [
		{ provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => LuSelectApi), multi: true },
		{ provide: NG_VALIDATORS, useExisting: forwardRef(() => LuSelectApi), multi: true },
	],
})
// tslint:disable-next-line:component-class-suffix
export class LuSelectApi<T extends IApiItem = IApiItem>
extends LuSelect<T> {

	@Input() selectApiFeeder: ISelectApiFeeder<T>;


	constructor(
		protected _elementRef: ElementRef,
		protected _renderer: Renderer2,
	) {
		super(_elementRef, _renderer);
	}

}
