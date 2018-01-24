/* Copyright 2017 Apinf Oy
  This file is covered by the EUPL license.
  You may obtain a copy of the licence at
  https://joinup.ec.europa.eu/community/eupl/og_page/european-union-public-licence-eupl-v11 */
// Meteor packages imports
import { Meteor } from 'meteor/meteor';
import { Template } from 'meteor/templating';
import { ReactiveVar } from 'meteor/reactive-var';

import { calculateTrend, arrowDirection, percentageValue }
  from '/apinf_packages/dashboard/lib/trend_helpers';
import { getDateRange } from '../helpers';

import { getHistogramData, getPublishedClients, previousTotalNumber } from '../../lib/es_requests';
// NPM imports
import moment from 'moment';

// Collection imports
import AclRules from '../../collection/index';

Template.mqttDashboardPage.onCreated(function () {
  const instance = this;
  instance.subscribe('favoriteTopics');

  instance.trend = new ReactiveVar({});
  instance.lastUpdatedTime = 0;
  instance.queryOption = getDateRange('1');

  instance.pubMessagesCount = new ReactiveVar(0);
  instance.delMessagesCount = new ReactiveVar(0);
  instance.subClientsCount = new ReactiveVar(0);
  instance.pubClientsCount = new ReactiveVar(0);

  instance.publishedMessagesData = new ReactiveVar();
  instance.deliveredMessagesData = new ReactiveVar();
  instance.publishedClientsData = new ReactiveVar();
  instance.subscribedClientsData = new ReactiveVar();


  this.sendRequest = () => {
    this.lastUpdatedTime = this.queryOption.to;

    // fetch data for Published messages
    const getPubMessages = getPublishedClients(this.queryOption);

    Meteor.call('sendElastisticsearchRequest', getPubMessages, (error, result) => {
      if (error) {
        sAlert.error(error.message);
      } else {
        const elasticsearchData = result.aggregations.data_over_time.buckets;

        let publishedClientsData = [];

        if (elasticsearchData.length === 0) {
          // Set
          elasticsearchData.push({
            doc_count: 0,
            key: this.queryOption.from,
          });

          publishedClientsData.push({
            doc_count: 0,
            key: this.queryOption.from,
          });
        } else {
          publishedClientsData = elasticsearchData.map(dataset => {
            return {
              // Get data
              key: dataset.key,
              // get count of unique users
              doc_count: dataset.pub_clients.value,
            };
          });
        }

        instance.publishedMessagesData.set(elasticsearchData);
        instance.publishedClientsData.set(publishedClientsData);

        const pubMessagesCount = result.aggregations.total_number.doc_count;
        instance.pubMessagesCount.set(pubMessagesCount + instance.pubMessagesCount.get());

        const pubClientsCount = result.aggregations.total_number.pub_clients.value;
        instance.pubClientsCount.set(pubClientsCount + instance.pubClientsCount.get());
      }
    });

    // fetch data for Published messages
    const getDelMessages = getHistogramData('message_delivered', this.queryOption);

    Meteor.call('sendElastisticsearchRequest', getDelMessages, (error, result) => {
      if (error) {
        sAlert.error(error.message);
      } else {
        const elasticsearchData = result.aggregations.data_over_time.buckets;

        if (elasticsearchData.length === 0) {
          elasticsearchData.push({
            doc_count: 0,
            key: this.queryOption.from,
          });
        }

        this.deliveredMessagesData.set(elasticsearchData);

        const delMessagesCount = result.aggregations.total_number.doc_count;
        instance.delMessagesCount.set(delMessagesCount + instance.delMessagesCount.get());
      }
    });

    // fetch data for Published messages
    const getSubClients = getHistogramData('client_subscribe', this.queryOption);

    Meteor.call('sendElastisticsearchRequest', getSubClients, (error, result) => {
      if (error) {
        sAlert.error(error.message);
      } else {
        const elasticsearchData = result.aggregations.data_over_time.buckets;

        if (elasticsearchData.length === 0) {
          elasticsearchData.push({
            doc_count: 0,
            key: this.queryOption.from,
          });
        }

        // Data for chart
        this.subscribedClientsData.set(elasticsearchData);

        // Data for total number
        const subClientsCount = result.aggregations.total_number.doc_count;
        instance.subClientsCount.set(subClientsCount + instance.subClientsCount.get());
      }
    });
  };

  this.getPreviousNumbers = () => {
    const previousData = previousTotalNumber(this.queryOption);

    Meteor.call('sendElastisticsearchRequest', previousData, (error, result) => {
      if (error) {
        sAlert.error(error.message);
      } else {
        const currentPeriod = result.aggregations.group_by_interval.buckets.currentPeriod;
        const previousPeriod = result.aggregations.group_by_interval.buckets.previousPeriod;

        const compareData = {
          pubMessages:
            calculateTrend(previousPeriod.published.doc_count, currentPeriod.published.doc_count),
          delMessages:
            calculateTrend(previousPeriod.message_delivered.doc_count,
              currentPeriod.message_delivered.doc_count),
          subClients:
            calculateTrend(previousPeriod.client_subscribe.doc_count,
              currentPeriod.client_subscribe.doc_count),
          pubClients:
            calculateTrend(previousPeriod.published.pub_clients.value,
              currentPeriod.published.pub_clients.value),
        };

        instance.trend.set(compareData);
      }
    });
  };

  instance.intervalId = setInterval(() => {
    this.queryOption.from = this.lastUpdatedTime;
    this.queryOption.to = moment(this.lastUpdatedTime).add(60, 's').valueOf();
    this.queryOption.interval = 'minute';
    this.sendRequest();
  }, 10000);

  this.sendRequest();
  this.getPreviousNumbers();
});

Template.mqttDashboardPage.helpers({
  arrowDirection (param) {
    const trend = Template.instance().trend.get();

    return arrowDirection(param, trend);
  },
  percentageValue (param) {
    const trend = Template.instance().trend.get();

    return percentageValue(param, trend);
  },
  textColor (param) {
    const trend = Template.instance().trend.get();

    const direction = arrowDirection(param, trend);

    return direction === 'arrow-up' ? 'text-green' : 'text-red';
  },
  // Chart data
  publishedMessagesData () {
    return Template.instance().publishedMessagesData.get();
  },
  deliveredMessagesData () {
    return Template.instance().deliveredMessagesData.get();
  },
  subscribedClientsData () {
    return Template.instance().subscribedClientsData.get();
  },
  publishedClientsData () {
    return Template.instance().publishedClientsData.get();
  },
  aclRules () {
    return AclRules.find().fetch();
  },
  count (param) {
    const instance = Template.instance();

    let count;

    switch (param) {
      case 'pub-message': {
        count = instance.pubMessagesCount.get();
        break;
      }
      case 'del-message': {
        count = instance.delMessagesCount.get();
        break;
      }
      case 'sub-client': {
        count = instance.subClientsCount.get();
        break;
      }
      case 'pub-client': {
        count = instance.pubClientsCount.get();
        break;
      }
      default:
        count = 0;
        break;
    }

    return count;
  },
});

