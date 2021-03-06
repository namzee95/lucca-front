import {
	ChangeDetectionStrategy,
	Component,
	ChangeDetectorRef,
	forwardRef,
	ViewContainerRef,
	ElementRef,
	HostListener,
	TemplateRef,
	ViewChild,
	Input,
	Renderer2,
	HostBinding,
	AfterContentInit
} from '@angular/core';
import { NG_VALUE_ACCESSOR, ControlValueAccessor } from '@angular/forms';
import { Overlay } from '@angular/cdk/overlay';
import { ILuInputWithPicker, ALuPickerPanel, ALuClearer, ILuClearer, ILuInputDisplayer, ALuInputDisplayer } from '../../../input/index';
import { IUser } from '../../user.model';
import { ALuSelectInput } from '../../../select/index';
import { ILuOptionPickerPanel } from '../../../option/index';
import { LuDisplayFullname } from '../../display/index';
import { ALuUserPagedSearcherService, LuUserPagedSearcherService } from '../searcher/index';

/**
* Displays user'picture or a placeholder with his/her initials and random bg color'
*/
@Component({
	selector: 'lu-user-select',
	templateUrl: './user-select-input.component.html',
	styleUrls: ['./user-select-input.component.scss'],
	changeDetection: ChangeDetectionStrategy.OnPush,
	providers: [
		{
			provide: NG_VALUE_ACCESSOR,
			useExisting: forwardRef(() => LuUserSelectInputComponent),
			multi: true,
		},
		{
			provide: ALuUserPagedSearcherService,
			useClass: LuUserPagedSearcherService,
		},
	],
})
export class LuUserSelectInputComponent<U extends IUser = IUser, P extends ILuOptionPickerPanel<U> = ILuOptionPickerPanel<U>>
extends ALuSelectInput<U, P>
implements ControlValueAccessor, ILuInputWithPicker<U>, AfterContentInit {
	@ViewChild('display', { read: ViewContainerRef }) protected set _vcDisplayContainer(vcr: ViewContainerRef) {
		this.displayContainer = vcr;
	}
	searchFormat = LuDisplayFullname.lastfirst;
	@HostBinding('tabindex') tabindex = 0;
	@HostBinding('class.mod-multiple')
	get modMultiple() { return this._multiple; }
	@HostBinding('class.mod-multipleView')
	get modMultipleView() { return this.useMultipleViews(); }

	@Input('placeholder') set inputPlaceholder(p: string) { this._placeholder = p; }
	@Input() set fields(fields: string) { this._service.fields = fields; }
	@Input() set filters(filters: string[]) { this._service.filters = filters; }
	@Input() set orderBy(orderBy: string) { this._service.orderBy = orderBy; }
	@Input() set transformFn(transformFn: (item: any) => U) { this._service.transformFn = transformFn; }
	@Input() set appInstanceId(appInstanceId: number | string) { this._service.appInstanceId = appInstanceId; }
	@Input() set operations(operations: number[]) { this._service.operations = operations; }

	@Input('multiple') set inputMultiple(m: boolean | string) {
		if (m === '') {
			// allows to have multiple = true when writing
			// <lu-api-select multiple>
			this.multiple = true;
		} else {
			this.multiple = !!m;
		}
	}
	constructor(
		protected _changeDetectorRef: ChangeDetectorRef,
		protected _overlay: Overlay,
		protected _elementRef: ElementRef,
		protected _viewContainerRef: ViewContainerRef,
		protected _renderer: Renderer2,
		protected _service: ALuUserPagedSearcherService<U>,
	) {
		super(
			_changeDetectorRef,
			_overlay,
			_elementRef,
			_viewContainerRef,
			_renderer,
		);
	}
	@HostBinding('attr.disabled')
	get isDisabled() { return this.disabled; }
	@HostBinding('class.is-focused')
	get isFocused() { return this._popoverOpen; }

	/**
	 * popover trigger class extension
	 */
	@ViewChild(ALuPickerPanel) set _vcPicker(picker: P) {
		this._picker = picker;
	}
	@ViewChild(ALuClearer) set _vcClearer(clearer: ILuClearer) {
		this._clearer = clearer;
	}
	@ViewChild(ALuInputDisplayer) set _vcDisplayer(displayer: ILuInputDisplayer<U>) {
		this.displayer = displayer;
		this.render();
	}
	/**
	 * bind to dom events
	 */
	@HostListener('click')
	onClick() {
		super.onClick();
	}
	@HostListener('mouseenter')
	onMouseEnter() {
		super.onMouseEnter();
	}
	@HostListener('mouseleave')
	onMouseLeave() {
		super.onMouseLeave();
	}
	@HostListener('focus')
	onFocus() {
		super.onFocus();
	}
	@HostListener('blur')
	onBlur() {
		super.onBlur();
	}
	@HostListener('keydown.space', ['$event'])
	@HostListener('keydown.enter', ['$event'])
	onKeydown($event: KeyboardEvent) {
		this.openPopover();
		$event.stopPropagation();
		$event.preventDefault();
	}

	ngAfterContentInit() {
		this._isContentInitialized = true;
		this.render();
		this._picker.setValue(this.value);
	}

}
