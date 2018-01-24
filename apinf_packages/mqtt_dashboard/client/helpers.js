/* Copyright 2017 Apinf Oy
  This file is covered by the EUPL license.
  You may obtain a copy of the licence at
  https://joinup.ec.europa.eu/community/eupl/og_page/european-union-public-licence-eupl-v11 */

import moment from 'moment/moment';

export function getDateRange (timeframe) {
  let interval;
  // Get current time
  const today = moment().valueOf();

  // Get timestamp of tomorrow 00:00:00 Date time (excluded value)
  const tomorrow = moment(0, 'HH').add(1, 'd').valueOf();

  // Get timestamp of timeframe ago 00:00:00 Date time (included value)
  const startDay = moment(tomorrow).subtract(timeframe, 'd').valueOf();

  const doublePeriodAgo = moment(startDay).subtract(timeframe, 'd').valueOf();

  if (timeframe === '1') {
    interval = 'hour';
  } else {
    interval = 'day';
  }

  return {
    doublePeriodAgo,
    onePeriodAgo: startDay,
    from: startDay,
    to: today,
    interval,
  };
}
