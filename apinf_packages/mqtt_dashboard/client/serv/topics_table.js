/* Copyright 2017 Apinf Oy
  This file is covered by the EUPL license.
  You may obtain a copy of the licence at
  https://joinup.ec.europa.eu/community/eupl/og_page/european-union-public-licence-eupl-v11 */
// Meteor packages imports
import { Meteor } from 'meteor/meteor';
import { Template } from 'meteor/templating';
import { ReactiveVar } from 'meteor/reactive-var';

import AclRules from '../../collection';
import { getTopicsData } from '../../lib/es_requests';
import { getDateRange } from '../helpers';
import { arrowDirection, calculateTrend, percentageValue }
  from '../../../dashboard/lib/trend_helpers';

Template.displayTopicsTable.onCreated(function () {
  // Variables initialization
  this.topicsList = new ReactiveVar();
  this.trend = new ReactiveVar();
  this.timeframe = new ReactiveVar('1');

  // Variables initialization
  const topicsData = [];
  const filters = { filters: {} };
  const clientFilters = { filters: {} };

  // Go through all topics and create the filters objects
  this.data.aclRules.forEach(acl => {
    const topic = acl.topic;
    const field = `topics.${topic}.qos`;

    filters.filters[topic] = { prefix: { 'topic.keyword': topic } };
    clientFilters.filters[topic] = { term: { [field]: 0 } };

    // Initialization of Topic list
    topicsData.push({
      id: acl._id,
      value: topic,
    });
  });

  this.topicsList.set(topicsData);

  this.sendRequest = () => {
    // Create a request body
    const queryBody = getTopicsData(filters, clientFilters, this.dateRange);

    // Send request to fetch data
    Meteor.call('sendElastisticsearchRequest', queryBody, (error, result) => {
      if (error) {
        // Display error message
        sAlert.error(error.message);
      } else {
        const generalTrend = {};

        const currentPeriod = result.aggregations.group_by_interval.buckets.currentPeriod;
        const previousPeriod = result.aggregations.group_by_interval.buckets.previousPeriod;

        const messagesBucket = currentPeriod.group_by_topic.buckets;
        const clientBucket = currentPeriod.clients.buckets;

        const prevMessagesBucket = previousPeriod.group_by_topic.buckets;
        const prevClientBucket = previousPeriod.clients.buckets;

        topicsData.forEach(topicItem => {
          const mb = messagesBucket[topicItem.value];
          const cb = clientBucket[topicItem.value];

          const prevMb = prevMessagesBucket[topicItem.value];
          const prevCb = prevClientBucket[topicItem.value];

          topicItem.incoming = 111;
          topicItem.outgoing = 111;
          topicItem.publishedMessages = mb.message_published.doc_count;
          topicItem.deliveredMessages = mb.message_delivered.doc_count;
          topicItem.subscribedClients = cb.client_subscribe.doc_count;
          topicItem.publishedClients = mb.message_published.client_publish.value;

          generalTrend[topicItem.value] = {
            pubMessages: calculateTrend(
              prevMb.message_published.doc_count, topicItem.publishedMessages
            ),
            delMessages: calculateTrend(
              mb.message_delivered.doc_count, topicItem.deliveredMessages
            ),
            subClients: calculateTrend(
              prevCb.client_subscribe.doc_count, topicItem.subscribedClients
            ),
            pubClients: calculateTrend(
              prevMb.message_published.client_publish.value, topicItem.publishedClients
            ),
          };
        });

        this.topicsList.set(topicsData);
        this.trend.set(generalTrend);
      }
    });
  };

  // Reactively watching of timeframe changes
  this.autorun(() => {
    const timeframe = this.timeframe.get();

    // Get timestamp of date range
    this.dateRange = getDateRange(timeframe);

    // Fetch data when timeframe is changed
    this.sendRequest();
  });
});

Template.displayTopicsTable.helpers({
  topicsList () {
    return Template.instance().topicsList.get();
  },
  starred () {
    const acl = AclRules.findOne(this.id);
    const starred = acl && acl.starred;

    return starred ? 'fa-star' : 'fa-star-o';
  },
  arrowDirection (param) {
    const trend = Template.instance().trend.get();

    return arrowDirection(param, trend[this.value]);
  },
  percentageValue (param) {
    const trend = Template.instance().trend.get();

    return percentageValue(param, trend[this.value]);
  },
  textColor (param) {
    const trend = Template.instance().trend.get();

    const direction = arrowDirection(param, trend[this.value]);

    return direction === 'arrow-up' ? 'text-green' : 'text-red';
  },
  trend () {
    return Template.instance().trend.get();
  },
});

Template.displayTopicsTable.events({
  'click .starred': (event) => {
    const topicId = event.currentTarget.dataset.id;

    const topicItem = AclRules.findOne(topicId);

    AclRules.update({ _id: topicId }, { $set: { starred: !topicItem.starred } });
  },
  'change #date-range-picker': (event, templateInstance) => {
    const value = event.currentTarget.value;

    templateInstance.timeframe.set(value);
  },
});
