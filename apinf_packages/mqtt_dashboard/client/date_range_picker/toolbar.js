/* Copyright 2017 Apinf Oy
 This file is covered by the EUPL license.
 You may obtain a copy of the licence at
 https://joinup.ec.europa.eu/community/eupl/og_page/european-union-public-licence-eupl-v11 */

// Meteor packages imports
import { Template } from 'meteor/templating';

// Meteor contributed packages imports
import { FlowRouter } from 'meteor/kadira:flow-router';

// Collection imports

// Template.dateRangePickerMqtt.onRendered(() => {
//   // Get value of timeframe parameter
//   const timeframeParameter = FlowRouter.getQueryParam('timeframe');
//
//   // Set value
//   this.$('#date-range-picker').val(timeframeParameter);
// });
//
// Template.dateRangePickerMqtt.events({
//   'change #date-range-picker': (event) => {
//     // Get value of select item
//     const paramValue = event.currentTarget.value;
//
//     // Modifies the current history entry instead of creating a new one
//     FlowRouter.withReplaceState(() => {
//       // Update value
//       FlowRouter.setQueryParams({ timeframe: paramValue });
//     });
//   },
// });
