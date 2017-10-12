import {
	AfterViewInit,
	Directive,
	ElementRef,
	EventEmitter,
	Input,
	OnDestroy,
	Optional,
	Output,
	ViewContainerRef,
} from '@angular/core';


import { isFakeMousedownFromScreenReader } from '@angular/cdk/a11y';
import { Direction, Directionality } from '@angular/cdk/bidi';
import {
	ConnectedPositionStrategy,
	Overlay,
	OverlayRef,
	OverlayConfig,
	HorizontalConnectionPos,
	VerticalConnectionPos
} from '@angular/cdk/overlay';
import { TemplatePortal } from '@angular/cdk/portal';

import { Subscription } from 'rxjs/Subscription';

import { LuPopoverPanel, LuTarget } from './popover.interfaces';
import { LuPopoverPositionX, LuPopoverPositionY, LuPopoverTriggerEvent } from './popover.types'
import { throwLuPopoverMissingError } from './popover.errors';



/**
 * This directive is intended to be used in conjunction with an lu-popover tag.  It is
 * responsible for toggling the display of the provided popover instance.
 */
@Directive({
	selector: '[LuPopoverTriggerFor]',
	host: {
		'aria-haspopup': 'true',
		'(mouseenter)': 'onMouseEnter()',
		'(mousedown)': '_handleMousedown($event)',
		'(mouseleave)': 'onMouseLeave()',
		'(click)': 'onClick()',
	},
	exportAs: 'LuPopoverTrigger'
})
export class LuPopoverTrigger implements AfterViewInit, OnDestroy {
	private _portal: TemplatePortal<any>;
	private _overlayRef: OverlayRef | null = null;
	private _popoverOpen: boolean = false;
	private _halt: boolean = false;
	private _backdropSubscription: Subscription;
	private _positionSubscription: Subscription;

	private _mouseoverTimer: any;

	// tracking input type is necessary so it's possible to only auto-focus
	// the first item of the list when the popover is opened via the keyboard
	private _openedByMouse: boolean = false;

	/** References the popover instance that the trigger is associated with. */
	@Input('LuPopoverTriggerFor') popover: LuPopoverPanel;

	/** References the popover target instance that the trigger is associated with. */
	@Input('LuPopoverTargetAt') targetElement: LuTarget;

	/** Position of the popover in the X axis */
	@Input('LuPopoverPositionX') positionX: LuPopoverPositionX;

	/** Position of the popover in the Y axis */
	@Input('LuPopoverPositionY') positionY: LuPopoverPositionY;

	/** Popover trigger event */
	@Input('LuPopoverTriggerOn') triggerEvent: LuPopoverTriggerEvent;

	/** Popover delay */
	@Input('LuPopoverEnterDelay') enterDelay: number;

	/** Popover delay */
	@Input('LuPopoverLeaveDelay') leaveDelay: number;

	/** Popover overlap trigger */
	@Input('LuPopoverOverlapTrigger') overlapTrigger: boolean;

	/** Popover target offset x */
	@Input('LuPopoverOffsetX') targetOffsetX: number;

	/** Popover target offset y */
	@Input('LuPopoverOffsetY') targetOffsetY: number;

	/** Popover arrow offset x */
	@Input('LuPopoverArrowOffsetX') arrowOffsetX: number;


	/** Popover arrow width */
	@Input('LuPopoverArrowWidth') arrowWidth: number;


	/** Popover arrow color */
	@Input('LuPopoverArrowColor') arrowColor: string;


	/** Popover container close on click */
	@Input('LuPopoverCloseOnClick') closeOnClick: boolean;


	/** Event emitted when the associated popover is opened. */
	@Output() onPopoverOpen = new EventEmitter<void>();

	/** Event emitted when the associated popover is closed. */
	@Output() onPopoverClose = new EventEmitter<void>();


	constructor(private _overlay: Overlay, private _element: ElementRef,
		private _viewContainerRef: ViewContainerRef,
		@Optional() private _dir: Directionality) { }

	ngAfterViewInit() {
		this._checkPopover();
		this._setCurrentConfig();
		this.popover.close.subscribe(() => this.closePopover());
	}

	ngOnDestroy() { this.destroyPopover(); }


	private _setCurrentConfig() {

		if (this.positionX === 'before' || this.positionX === 'after') {
			this.popover.positionX = this.positionX;
		}

		if (this.positionY === 'above' || this.positionY === 'below') {
			this.popover.positionY = this.positionY;
		}

		if (this.triggerEvent) {
			this.popover.triggerEvent = this.triggerEvent;
		}

		if (this.enterDelay) {
			this.popover.enterDelay = this.enterDelay;
		}

		if (this.leaveDelay) {
			this.popover.leaveDelay = this.leaveDelay;
		}

		if (this.overlapTrigger === true || this.overlapTrigger === false) {
			this.popover.overlapTrigger = this.overlapTrigger;
		}

		if (this.targetOffsetX) {
			this.popover.targetOffsetX = this.targetOffsetX;
		}

		if (this.targetOffsetY) {
			this.popover.targetOffsetY = this.targetOffsetY;
		}

		if (this.arrowOffsetX) {
			this.popover.arrowOffsetX = this.arrowOffsetX;
		}

		if (this.arrowWidth) {
			this.popover.arrowWidth = this.arrowWidth;
		}

		if (this.arrowColor) {
			this.popover.arrowColor = this.arrowColor;
		}

		if (this.closeOnClick === true || this.closeOnClick === false) {
			this.popover.closeOnClick = this.closeOnClick;
		}

		this.popover.setCurrentStyles();
	}


	/** Whether the popover is open. */
	get popoverOpen(): boolean { return this._popoverOpen; }

	onClick() {
		if (this.popover.triggerEvent === 'click') {
			// this.popover.setCurrentStyles();
			// this._setCurrentConfig();
			this.togglePopover();
		}
	}

	onMouseEnter() {
		this._halt = false;
		if (this.popover.triggerEvent === 'hover') {
			this._mouseoverTimer = setTimeout(() => {
				this.openPopover();
			}, this.popover.enterDelay);
		}
	}

	onMouseLeave() {
		if (this.popover.triggerEvent === 'hover') {
			if (this._mouseoverTimer) {
				clearTimeout(this._mouseoverTimer);
				this._mouseoverTimer = null;
			}
			if (this._popoverOpen) {
				setTimeout(() => {
					if (!this.popover.closeDisabled) {
						this.closePopover();
					}
				}, this.popover.leaveDelay);
			} else {
				this._halt = true;
			}
		}
	}

	/** Toggles the popover between the open and closed states. */
	togglePopover(): void {
		return this._popoverOpen ? this.closePopover() : this.openPopover();
	}

	/** Opens the popover. */
	openPopover(): void {
		if (!this._popoverOpen && !this._halt) {
			this._createOverlay().attach(this._portal);

			/** Only subscribe to backdrop if trigger event is click */
			if (this.triggerEvent === 'click') {
				this._subscribeToBackdrop();
			}

			this._initPopover();
		}
	}

	/** Closes the popover. */
	closePopover(): void {
		if (this._overlayRef) {
			this._overlayRef.detach();

			/** Only unsubscribe to backdrop if trigger event is click */
			if (this.triggerEvent === 'click') {
				this._backdropSubscription.unsubscribe();
			}

			this._resetPopover();
		}
	}

	/** Removes the popover from the DOM. */
	destroyPopover(): void {
		if (this._overlayRef) {
			this._overlayRef.dispose();
			this._overlayRef = null;
			this._cleanUpSubscriptions();
		}
	}

	/** Focuses the popover trigger. */
	focus() {
		this._element.nativeElement.focus();
	}

	/** The text direction of the containing app. */
	get dir(): Direction {
		return this._dir && this._dir.value === 'rtl' ? 'rtl' : 'ltr';
	}

	/**
	* This method ensures that the popover closes when the overlay backdrop is clicked.
	* We do not use first() here because doing so would not catch clicks from within
	* the popover, and it would fail to unsubscribe properly. Instead, we unsubscribe
	* explicitly when the popover is closed or destroyed.
	*/
	private _subscribeToBackdrop(): void {
		if (this._overlayRef) {
			this._backdropSubscription = this._overlayRef.backdropClick().subscribe(() => {
				this.popover._emitCloseEvent();
			});
		}
	}

	/**
	* This method sets the popover state to open and focuses the first item if
	* the popover was opened via the keyboard.
	*/
	private _initPopover(): void {
		this._setIsPopoverOpen(true);
	}

	/**
	* This method resets the popover when it's closed, most importantly restoring
	* focus to the popover trigger if the popover was opened via the keyboard.
	*/
	private _resetPopover(): void {
		this._setIsPopoverOpen(false);

		// Focus only needs to be reset to the host element if the popover was opened
		// by the keyboard and manually shifted to the first popover item.
		if (!this._openedByMouse) {
			this.focus();
		}
		this._openedByMouse = false;
	}

	/** set state rather than toggle to support triggers sharing a popover */
	private _setIsPopoverOpen(isOpen: boolean): void {
		this._popoverOpen = isOpen;
		this._popoverOpen ? this.onPopoverOpen.emit() : this.onPopoverClose.emit();
	}

	/**
	*  This method checks that a valid instance of MdPopover has been passed into
	*  mdPopoverTriggerFor. If not, an exception is thrown.
	*/
	private _checkPopover() {
		if (!this.popover) {
			throwLuPopoverMissingError();
		}
	}

	/**
	*  This method creates the overlay from the provided popover's template and saves its
	*  OverlayRef so that it can be attached to the DOM when openPopover is called.
	*/
	private _createOverlay(): OverlayRef {
		if (!this._overlayRef) {
			this._portal = new TemplatePortal(this.popover.templateRef, this._viewContainerRef);
			const config = this._getOverlayConfig();
			this._subscribeToPositions(config.positionStrategy as ConnectedPositionStrategy);
			this._overlayRef = this._overlay.create(config);
		}

		return this._overlayRef;
	}

	/**
	* This method builds the configuration object needed to create the overlay, the OverlayConfig.
	* @returns OverlayConfig
	*/
	private _getOverlayConfig(): OverlayConfig {
		const overlayState = new OverlayConfig();
		overlayState.positionStrategy = this._getPosition()
			.withDirection(this.dir);

		/** Display overlay backdrop if trigger event is click */
		if (this.triggerEvent === 'click') {
			overlayState.hasBackdrop = true;
			overlayState.backdropClass = 'cdk-overlay-transparent-backdrop';
		}

		overlayState.direction = this.dir;
		overlayState.scrollStrategy = this._overlay.scrollStrategies.reposition();
		return overlayState;
	}

	/**
	* Listens to changes in the position of the overlay and sets the correct classes
	* on the popover based on the new position. This ensures the animation origin is always
	* correct, even if a fallback position is used for the overlay.
	*/
	private _subscribeToPositions(position: ConnectedPositionStrategy): void {
		this._positionSubscription = position.onPositionChange.subscribe(change => {
			const posisionX: LuPopoverPositionX = change.connectionPair.overlayX === 'start' ? 'after' : 'before';
			let posisionY: LuPopoverPositionY = change.connectionPair.overlayY === 'top' ? 'below' : 'above';

			if (this.popover.overlapTrigger) {
				posisionY = posisionY === 'below' ? 'above' : 'below';
			}

			this.popover.positionX = posisionX;
			this.popover.positionY = posisionY;
			this.popover.setCurrentStyles();

			this.popover.setPositionClasses(posisionX, posisionY);
		});
	}

	/**
	* This method builds the position strategy for the overlay, so the popover is properly connected
	* to the trigger.
	* @returns ConnectedPositionStrategy
	*/
	private _getPosition(): ConnectedPositionStrategy {
		const [posX, fallbackX]: HorizontalConnectionPos[] =
			this.popover.positionX === 'before' ? ['end', 'start'] : ['start', 'end'];

		const [overlayY, fallbackOverlayY]: VerticalConnectionPos[] =
			this.popover.positionY === 'above' ? ['bottom', 'top'] : ['top', 'bottom'];

		let originY = overlayY;
		let fallbackOriginY = fallbackOverlayY;

		/** Reverse overlayY and fallbackOverlayY when overlapTrigger is false */
		if (!this.popover.overlapTrigger) {
			originY = overlayY === 'top' ? 'bottom' : 'top';
			fallbackOriginY = fallbackOverlayY === 'top' ? 'bottom' : 'top';
		}

		let offsetX = 0;
		let offsetY = 0;

		if (this.popover.targetOffsetX && !isNaN(Number(this.popover.targetOffsetX))) {
			offsetX = Number(this.popover.targetOffsetX);
			// offsetX = -16;
		}

		if (this.popover.targetOffsetY && !isNaN(Number(this.popover.targetOffsetY))) {
			if (this.popover.positionY === 'below') {
				offsetY = Number(this.popover.targetOffsetY);
			} else {
				offsetY = -Number(this.popover.targetOffsetY);
			}

			// offsetY = -10;
		}

		/**
		 * For overriding position element, when LuPopoverTargetAt has a valid element reference.
		 * Useful for sticking popover to parent element and offsetting arrow to trigger element.
		 * If undefined defaults to the trigger element reference.
		 */
		let element = this._element;
		if (typeof this.targetElement !== 'undefined') {
			this.popover.containerPositioning = true;
			element = this.targetElement._elementRef;
		}

		return this._overlay.position()
			.connectedTo(element,
			{ originX: posX, originY: originY },
			{ overlayX: posX, overlayY: overlayY })
			.withFallbackPosition(
			{ originX: fallbackX, originY: originY },
			{ overlayX: fallbackX, overlayY: overlayY })
			.withFallbackPosition(
			{ originX: posX, originY: fallbackOriginY },
			{ overlayX: posX, overlayY: fallbackOverlayY })
			.withFallbackPosition(
			{ originX: fallbackX, originY: fallbackOriginY },
			{ overlayX: fallbackX, overlayY: fallbackOverlayY })
			.withOffsetX(offsetX)
			.withOffsetY(offsetY);
	}

	private _cleanUpSubscriptions(): void {
		if (this._backdropSubscription) {
			this._backdropSubscription.unsubscribe();
		}
		if (this._positionSubscription) {
			this._positionSubscription.unsubscribe();
		}
	}

	_handleMousedown(event: MouseEvent): void {
		if (!isFakeMousedownFromScreenReader(event)) {
			this._openedByMouse = true;
		}
	}
}
