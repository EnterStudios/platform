/* Copyright 2017 Apinf Oy
  This file is covered by the EUPL license.
  You may obtain a copy of the licence at
  https://joinup.ec.europa.eu/community/eupl/og_page/european-union-public-licence-eupl-v11 */

import { ReactiveVar } from 'meteor/reactive-var';
import { Meteor } from 'meteor/meteor';
import { Template } from 'meteor/templating';

import { getParticularTopicData, getTopicEventTypesData } from '../lib/es_requests';
import moment from 'moment';
import AclRules from '../collection';
import { getDateRange } from './helpers';
import {arrowDirection, calculateTrend, percentageValue} from '../../dashboard/lib/trend_helpers';

Template.topicPage.onCreated(function () {
// Subscription
  const instance = this;

  let subscription;
  this.eventType = new ReactiveVar('message_published');
  this.aggregatedData = new ReactiveVar();
  this.chartType = new ReactiveVar('real-time');
  this.timeframe = new ReactiveVar('1');
  this.summaryStatistics = new ReactiveVar({
    message_published: 0,
    message_delivered: 0,
    client_publish: 0,
    client_subscribe: 0,
  });

  instance.trend = new ReactiveVar({});
  instance.topic = new ReactiveVar();

  this.previousPeriod = new ReactiveVar();

  // Subscrube to ACL document
  this.autorun(() => {
    const topicId = FlowRouter.getParam('id');

    if (topicId) {
      subscription = this.subscribe('topicAclRules', topicId);

      const isReady = subscription.ready();

      if (isReady) {
        const acl = AclRules.findOne();

        this.topic.set(acl.topic);
      }
    }
  });

  this.sendRequest = () => {
    Meteor.call('sendElastisticsearchRequest', this.requestBody, (error, result) => {
      if (error) {
        sAlert.error(error.message);
      } else {
        const elasticsearchData = result.aggregations.data_over_time.buckets;

        if (this.eventType.get() === 'client_publish') {
          const pubslihedClients = publishedClients(elasticsearchData, this.queryOption.from);

          this.aggregatedData.set(pubslihedClients);

        } else {
          if (elasticsearchData.length === 0) {
            // Set
            elasticsearchData.push({
              doc_count: 0,
              key: this.queryOption.from,
            });
          }

          this.aggregatedData.set(elasticsearchData);
        }
      }
    });
  };

  this.totalNumberRequest = (dateRange, periodType, topic) => {
    const requestBody = getTopicEventTypesData(dateRange, topic);
    Meteor.call('sendElastisticsearchRequest', requestBody, (error, result) => {
      if (error) {
        sAlert.error(error.message);
        throw new Meteor.Error(error.message);
      }

      if (periodType === 'current') {
        const currentPeriod = result.aggregations;

        const data = this.summaryStatistics.get();

        this.summaryStatistics.set({
          message_published:
          data.message_published + currentPeriod.topic_types.message_published.doc_count,
          message_delivered:
          data.message_delivered + currentPeriod.topic_types.message_delivered.doc_count,
          client_publish: data.client_publish + currentPeriod.topic_types.message_published.client_published.value,
          client_subscribe: data.client_subscribe + currentPeriod.client_subscribe.doc_count,
        });
      } else {
        this.previousPeriod.set(result.aggregations);
      }
    });
  };

  // Update total numbers of request while Timeframe is updated
  this.autorun(() => {
    console.log('update timeframe');
    const timeframe = this.timeframe.get();
    const topic = this.topic.get();
    if (topic) {
      this.queryOption = getDateRange(timeframe);

      this.totalNumberRequest(this.queryOption, 'current', topic);
      this.totalNumberRequest({ from: this.queryOption.doublePeriodAgo, to: this.queryOption.onePeriodAgo }, 'previous', topic);
    }
  });

  // Watching at changes of Event type & timeframe to update Charts
  this.autorun(() => {
    // Get Even type
    const eventType = this.eventType.get();
    const timeframe = this.timeframe.get();
    const topic = this.topic.get();
    console.log('update event type');

    if (topic) {
      // Create request body to fetch data for Chart and total number
      instance.requestBody = getParticularTopicData(eventType, this.queryOption, topic);
      // Send request
      instance.sendRequest();
      if (timeframe === '1') {
        instance.intervalId = setInterval(() => {
          console.log('set interval');
          this.queryOption.interval = 'minute';

          this.queryOption.from = this.queryOption.to;
          this.queryOption.to = moment(this.queryOption.from).add(60, 's').valueOf();

          // Create request body to fetch data for Chart and total number
          instance.requestBody = getParticularTopicData(eventType, this.queryOption, topic);
          // Send request
          this.sendRequest();
          // Update Total numbers of requests as well
          this.totalNumberRequest(this.queryOption, 'current', topic);
        }, 60000);
      } else {
        // Turn off real-time update
        clearInterval(instance.intervalId);
      }
    }
  });

  // Upda compare data
  this.autorun(() => {
    const data = this.summaryStatistics.get();

    const previousPeriod = this.previousPeriod.get();

    if (previousPeriod) {
      const compareData = {
        pubMessages:
          calculateTrend(previousPeriod.topic_types.message_published.doc_count, data.message_published),
        delMessages:
          calculateTrend(previousPeriod.topic_types.message_delivered.doc_count, data.message_delivered),
        subClients:
          calculateTrend(previousPeriod.client_subscribe.doc_count, data.client_subscribe),
        pubClients:
          calculateTrend(previousPeriod.topic_types.message_published.client_published.value, data.client_publish),
      };
      instance.trend.set(compareData);
    }
  });
});

Template.topicPage.helpers({
  aggregatedData () {
    return Template.instance().aggregatedData.get();
  },
  topicValue () {
    return Template.instance().topic.get();
  },
  chartType () {
    return Template.instance().chartType.get();
  },
  totalNumber (param) {
    const data = Template.instance().summaryStatistics.get();

    return data[param];
  },
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
  realTimeMode () {
    const timeframe = Template.instance().timeframe.get();

    return timeframe === '1';
  },
});

Template.topicPage.events({
  'click [name="data-type"]': (event, templateInstance) => {
    const eventType = event.currentTarget.value;
    templateInstance.eventType.set(eventType);
  },
  'change #date-range-picker': (event, templateInstance) => {
    const value = event.currentTarget.value;
    templateInstance.timeframe.set(value);
  },
});

function publishedClients (elasticsearchData, date) {
  // no data
  if (elasticsearchData.length === 0) {
    // Return the null data
    return [{
      doc_count: 0,
      key: date,
    }];
  }

  return elasticsearchData.map(dataset => {
    return {
      // Get data
      key: dataset.key,
      // get count of unique users
      doc_count: dataset.client_publish.value,
    };
  });
}
