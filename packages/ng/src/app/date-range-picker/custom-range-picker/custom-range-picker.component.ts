import { Component, OnInit } from '@angular/core';
import {MdDialogRef} from '@angular/material';
import * as moment from 'moment';

@Component({
	selector: 'lu-custom-range-picker',
	templateUrl: './custom-range-picker.component.html'
})
export class CustomRangePickerComponent implements OnInit {

	min: moment.Moment = null;
	max: moment.Moment = null;

	constructor(public dialogRef: MdDialogRef<any>) { }

	ngOnInit() { }

	updateMin(date) {
		this.min = moment(date).startOf('day');
		this.tryAndAutoClose();
	}

	updateMax(date) {
		this.max = moment(date).add(1, 'day').startOf('day');
		this.tryAndAutoClose();
	}

	hasTwoValidDates() {
		return !!this.min && !!this.max && this.min.isBefore(this.max);
	}

	tryAndAutoClose() {
		if (this.hasTwoValidDates()) {
			this.close(true, true);
		}
	}

	close(withMin: boolean, withMax: boolean) {
		if (!withMin) {this.min = null}
		if (!withMax) {this.max = null}
		this.dialogRef.close({min: this.min, max: this.max});
	}

}
