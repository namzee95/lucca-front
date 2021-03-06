import {
	AfterViewInit,
	Directive,
	ElementRef,
	EventEmitter,
	Input,
	OnDestroy,
	Output,
	ViewContainerRef,
	HostListener,
} from '@angular/core';

import {
	Overlay,
} from '@angular/cdk/overlay';


import {
	ILuPopoverTrigger, ALuPopoverTrigger,
} from './popover-trigger.model';
import {
	ILuPopoverPanel,
} from '../panel/popover-panel.model';
import {
	ILuPopoverTarget,
} from '../target/popover-target.model';

/**
* This directive is intended to be used in conjunction with an lu-popover tag.  It is
* responsible for toggling the display of the provided popover instance.
*/
@Directive({
	selector: '[luPopoverTriggerFor]',
	host: {
		'aria-haspopup': 'true',
		'(mousedown)': '_handleMousedown($event)',
	},
	exportAs: 'LuPopoverTrigger',
})
export class LuPopoverTriggerDirective<T extends ILuPopoverPanel = ILuPopoverPanel>
extends ALuPopoverTrigger<T>
implements ILuPopoverTrigger<T>, AfterViewInit, OnDestroy {

	/** References the popover instance that the trigger is associated with. */
	@Input('luPopoverTriggerFor') popover: T;

	/** References the popover target instance that the trigger is associated with. */
	@Input('luPopoverTargetAt') targetElement: ILuPopoverTarget;

	/** Event emitted when the associated popover is opened. */
	@Output() onPopoverOpen = new EventEmitter<void>();

	/** Event emitted when the associated popover is closed. */
	@Output() onPopoverClose = new EventEmitter<void>();

	constructor(
		protected _overlay: Overlay,
		protected _elementRef: ElementRef,
		protected _viewContainerRef: ViewContainerRef,
	) {
		super(_overlay, _elementRef, _viewContainerRef);
	}

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
}
