import {
	AfterViewInit,
	ElementRef,
	EventEmitter,
	OnDestroy,
	ViewContainerRef,
} from '@angular/core';

import { isFakeMousedownFromScreenReader } from '@angular/cdk/a11y';
import { Direction } from '@angular/cdk/bidi';
import {
	ConnectedPositionStrategy,
	OriginConnectionPosition,
	Overlay,
	OverlayConnectionPosition,
	OverlayRef,
	OverlayConfig,
	HorizontalConnectionPos,
	VerticalConnectionPos,
} from '@angular/cdk/overlay';
import { TemplatePortal, ComponentPortal } from '@angular/cdk/portal';

import { Subscription } from 'rxjs';

import {
	ILuPopoverPanel,
	LuPopoverPosition,
	LuPopoverTriggerEvent,
	LuPopoverAlignment,
	LuPopoverScrollStrategy,
} from '../panel/popover-panel.model';
import {
	ILuPopoverTarget,
} from '../target/popover-target.model';
import { throwLuPopoverMissingError } from '../popover.errors';

export interface ILuPopoverTrigger<T extends ILuPopoverPanel = ILuPopoverPanel> {
	popover: T;
}

export abstract class ALuPopoverTrigger<T extends ILuPopoverPanel = ILuPopoverPanel>
implements ILuPopoverTrigger<T>, AfterViewInit, OnDestroy {
	protected _portal: TemplatePortal<any> | ComponentPortal<any>;
	protected _overlayRef: OverlayRef | null = null;
	protected _popoverOpen = false;
	protected _halt = false;
	protected _backdropSubscription: Subscription;
	protected _positionSubscription: Subscription;
	protected _disabled: boolean;

	protected _mouseoverTimer: any;

	// tracking input type is necessary so it's possible to only auto-focus
	// the first item of the list when the popover is opened via the keyboard
	protected _openedByMouse = false;

	/** References the popover instance that the trigger is associated with. */
	popover: T;
	position: LuPopoverPosition = 'above';
	alignment: LuPopoverAlignment;
	scrollStrategy: LuPopoverScrollStrategy = 'close';
	containerPositioning: boolean;
	overlapTrigger: boolean;
	triggerEvent: LuPopoverTriggerEvent = 'click';
	targetOffsetX: number;
	targetOffsetY: number;

	/** References the popover target instance that the trigger is associated with. */
	targetElement: ILuPopoverTarget;

	/** Event emitted when the associated popover is opened. */
	onPopoverOpen = new EventEmitter<void>();

	/** Event emitted when the associated popover is closed. */
	onPopoverClose = new EventEmitter<void>();

	constructor(
		protected _overlay: Overlay,
		protected _elementRef: ElementRef,
		protected _viewContainerRef: ViewContainerRef,
	) {}

	ngAfterViewInit() {
		this._checkPopover();
		this.popover.close.subscribe(() => {
			this.closePopover();
		});
	}

	ngOnDestroy() {
		this.destroyPopover();
	}

	/** Whether the popover is open. */
	get popoverOpen(): boolean {
		return this._popoverOpen;
	}

	onClick() {
		if (this.popover.triggerEvent === 'click') {
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
	onFocus() {
		if (this.popover.triggerEvent === 'focus') {
			this.openPopover();
		}
	}
	onBlur() {
		if (this.popover.triggerEvent === 'focus') {
			this.closePopover();
		}
	}

	/** Toggles the popover between the open and closed states. */
	togglePopover(): void {
		return this._popoverOpen ? this.closePopover() : this.openPopover();
	}

	/** Opens the popover. */
	openPopover(): void {
		if (!this._popoverOpen && !this._halt && !this._disabled) {
			this._createOverlay();
			this._overlayRef.attach(this._portal);

			/** Only subscribe to backdrop if trigger event is click */
			if (this.popover.triggerEvent === 'click') {
				this._subscribeToBackdrop();
			}

			this._initPopover();
		}
	}

	/** Closes the popover. */
	closePopover(): void {
		if (this._overlayRef) {
			this._overlayRef.detach();

			/** unsubscribe to backdrop click if it was defined */
			if (!!this._backdropSubscription) {
				// if (this.popover.triggerEvent === 'click') {
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
		this._elementRef.nativeElement.focus();
	}

	_handleMousedown(event: MouseEvent): void {
		if (!isFakeMousedownFromScreenReader(event)) {
			this._openedByMouse = true;
		}
	}

	/** The text direction of the containing app. */
	get dir(): Direction {
		// return this._dir && this._dir.value === 'rtl' ? 'rtl' : 'ltr';
		return 'ltr';
	}

	/** Return if the popover main positionning is vertical */
	get isVerticallyPositionned(): boolean {
		const position = this.popover ? this.popover.position : this.position;
		return (
			position === 'below' || position === 'above'
		);
	}

	/**
	 * This method ensures that the popover closes when the overlay backdrop is clicked.
	 * We do not use first() here because doing so would not catch clicks from within
	 * the popover, and it would fail to unsubscribe properly. Instead, we unsubscribe
	 * explicitly when the popover is closed or destroyed.
	 */
	protected _subscribeToBackdrop(): void {
		if (this._overlayRef) {
			this._backdropSubscription = this._overlayRef
				.backdropClick()
				.subscribe(() => {
					this.popover.onClose();
				});
		}
	}

	/**
	 * This method sets the popover state to open and focuses the first item if
	 * the popover was opened via the keyboard.
	 */
	protected _initPopover(): void {
		this._setIsPopoverOpen(true);
		this.popover.keydownEvents$ = this._overlayRef.keydownEvents();
	}

	/**
	 * This method resets the popover when it's closed, most importantly restoring
	 * focus to the popover trigger if the popover was opened via the keyboard.
	 */
	protected _resetPopover(): void {
		this._setIsPopoverOpen(false);

		// Focus only needs to be reset to the host element if the popover was opened
		// by the keyboard and manually shifted to the first popover item.
		if (!this._openedByMouse && this.popover.triggerEvent === 'click') {
			this.focus();
		}
		this._openedByMouse = false;
	}

	/** set state rather than toggle to support triggers sharing a popover */
	protected _setIsPopoverOpen(isOpen: boolean): void {
		this._popoverOpen = isOpen;
		this._popoverOpen ? this.popover.onOpen() : (() => {})();
		this._popoverOpen ? this.onPopoverOpen.emit() : this.onPopoverClose.emit();
	}

	/**
	 *  This method checks that a valid instance of MdPopover has been passed into
	 *  mdPopoverTriggerFor. If not, an exception is thrown.
	 */
	protected _checkPopover() {
		if (!this.popover) {
			throwLuPopoverMissingError();
		}
	}

	/**
	 *  This method creates the overlay from the provided popover's template and saves its
	 *  OverlayRef so that it can be attached to the DOM when openPopover is called.
	 */
	protected _createOverlay(): OverlayRef {
		if (!this._overlayRef) {
			this._portal = new TemplatePortal(
				this.popover.templateRef,
				this._viewContainerRef,
			);
			const config = this._getOverlayConfig();
			this._subscribeToPositions(
				config.positionStrategy as ConnectedPositionStrategy,
			);
			this._overlayRef = this._overlay.create(config);
		}

		return this._overlayRef;
	}

	/**
	 * This method builds the configuration object needed to create the overlay, the OverlayConfig.
	 * @returns OverlayConfig
	 */
	protected _getOverlayConfig(): OverlayConfig {
		const overlayState = new OverlayConfig();
		overlayState.positionStrategy = this._getPosition().withDirection(this.dir);
		const triggerEvent = this.popover ? this.popover.triggerEvent : this.triggerEvent;
		/** Display overlay backdrop if trigger event is click */
		if (triggerEvent === 'click') {
			overlayState.hasBackdrop = true;
			overlayState.backdropClass = 'cdk-overlay-transparent-backdrop';
		}

		overlayState.direction = this.dir;
		const scrollStrategy = this.popover ? this.popover.scrollStrategy : this.scrollStrategy;
		switch (scrollStrategy) {
			case 'block':
				overlayState.scrollStrategy = this._overlay.scrollStrategies.block();
				break;

			case 'close':
				overlayState.scrollStrategy = this._overlay.scrollStrategies.close();
				break;

			default:
				overlayState.scrollStrategy = this._overlay.scrollStrategies.reposition();
				break;
		}
		return overlayState;
	}

	/**
	 * Listens to changes in the position of the overlay and sets the correct classes
	 * on the popover based on the new position. This ensures the animation origin is always
	 * correct, even if a fallback position is used for the overlay.
	 */
	protected _subscribeToPositions(position: ConnectedPositionStrategy): void {
		this._positionSubscription = position.onPositionChange.subscribe(change => {
			const posX: LuPopoverPosition =
				change.connectionPair.overlayX === 'end' ? 'before' : 'after';
			const posY: LuPopoverPosition =
				change.connectionPair.overlayY === 'bottom' ? 'above' : 'below';
			this.popover.setPositionClassesChanges(posX, posY);
		});
	}

	/**
	 * This method builds the position strategy for the overlay, so the popover is properly connected
	 * to the trigger.
	 * @returns ConnectedPositionStrategy
	 */
	protected _getPosition(): ConnectedPositionStrategy {
		const connectionPosition: OriginConnectionPosition = {
			originX: 'start',
			originY: 'top',
		};

		// Position
		const position = this.popover ? this.popover.position : this.position;
		const popoverOverlapTrigger = this.popover ? this.popover.overlapTrigger : false;
		const overlapTrigger = popoverOverlapTrigger || this.overlapTrigger;
		if (position === 'above') {
			connectionPosition.originY = overlapTrigger ? 'bottom' : 'top';
		} else if (position === 'below') {
			connectionPosition.originY = overlapTrigger ? 'top' : 'bottom';
		} else if (position === 'before') {
			connectionPosition.originX = overlapTrigger ? 'end' : 'start';
		} else if (position === 'after') {
			connectionPosition.originX = overlapTrigger ? 'start' : 'end';
		}

		// Alignment
		const alignment = this.popover ? this.popover.alignment : this.alignment;
		if (this.isVerticallyPositionned) {
			if (alignment === 'left') {
				connectionPosition.originX = 'start';
			} else if (alignment === 'right') {
				connectionPosition.originX = 'end';
			} else {
				connectionPosition.originX = 'center';
			}
		} else {
			if (alignment === 'top') {
				connectionPosition.originY = 'top';
			} else if (alignment === 'bottom') {
				connectionPosition.originY = 'bottom';
			} else {
				connectionPosition.originY = 'center';
			}
		}

		const overlayPosition: OverlayConnectionPosition = {
			overlayX: 'start',
			overlayY: 'top',
		};

		if (overlapTrigger) {
			overlayPosition.overlayX = connectionPosition.originX;
			overlayPosition.overlayY = connectionPosition.originY;
		} else if (this.isVerticallyPositionned) {
			overlayPosition.overlayX = connectionPosition.originX;
			overlayPosition.overlayY =
				position === 'above' ? 'bottom' : 'top';
		} else {
			overlayPosition.overlayX =
				position === 'before' ? 'end' : 'start';
			overlayPosition.overlayY = connectionPosition.originY;
		}

		let offsetX = 0;
		let offsetY = 0;

		const targetOffsetX = this.popover ? this.popover.targetOffsetX : this.targetOffsetX;
		const targetOffsetY = this.popover ? this.popover.targetOffsetY : this.targetOffsetY;

		if (
			overlapTrigger &&
			!this.isVerticallyPositionned &&
			targetOffsetX &&
			!isNaN(Number(targetOffsetX))
		) {
			if (overlayPosition.overlayX === 'end') {
				offsetX = -Number(targetOffsetX);
			} else if (overlayPosition.overlayX === 'start') {
				offsetX = Number(targetOffsetX);
			}
		}

		if (
			this.isVerticallyPositionned &&
			targetOffsetY &&
			!isNaN(Number(targetOffsetY))
		) {
			if (overlayPosition.overlayY === 'top') {
				offsetY = Number(targetOffsetY);
			} else if (overlayPosition.overlayY === 'bottom') {
				offsetY = -Number(targetOffsetY);
			}
		}

		/**
		 * For overriding position element, when LuPopoverTargetAt has a valid element reference.
		 * Useful for sticking popover to parent element and offsetting arrow to trigger element.
		 * If undefined defaults to the trigger element reference.
		 */
		let element = this._elementRef;
		if (typeof this.targetElement !== 'undefined' && this.popover) {
			this.popover.containerPositioning = true;
			element = this.targetElement._elementRef;
		}

		/**
		 * TODO: Updates when withFallbackPosition takes individual offsets
		 */

		return this._overlay
			.position()
			.connectedTo(element, connectionPosition, overlayPosition)
			.withFallbackPosition(
				{
					originX: connectionPosition.originX,
					originY: this._invertVerticalPos(connectionPosition.originY),
				},
				{
					overlayX: overlayPosition.overlayX,
					overlayY: this._invertVerticalPos(overlayPosition.overlayY),
				},
			)
			.withFallbackPosition(
				{
					originX: this._invertHorizontalPos(connectionPosition.originX),
					originY: connectionPosition.originY,
				},
				{
					overlayX: this._invertHorizontalPos(overlayPosition.overlayX),
					overlayY: overlayPosition.overlayY,
				},
			)
			.withFallbackPosition(
				{
					originX: this._invertHorizontalPos(connectionPosition.originX),
					originY: this._invertVerticalPos(connectionPosition.originY),
				},
				{
					overlayX: this._invertHorizontalPos(overlayPosition.overlayX),
					overlayY: this._invertVerticalPos(overlayPosition.overlayY),
				},
			)
			.withOffsetX(offsetX)
			.withOffsetY(offsetY);
	}

	protected _invertVerticalPos(y: VerticalConnectionPos) {
		if (y === 'top') {
			y = 'bottom';
		} else if (y === 'bottom') {
			y = 'top';
		}
		return y;
	}

	protected _invertHorizontalPos(x: HorizontalConnectionPos) {
		if (x === 'end') {
			x = 'start';
		} else if (x === 'start') {
			x = 'end';
		}

		return x;
	}

	protected _cleanUpSubscriptions(): void {
		if (this._backdropSubscription) {
			this._backdropSubscription.unsubscribe();
		}
		if (this._positionSubscription) {
			this._positionSubscription.unsubscribe();
		}
	}
}
