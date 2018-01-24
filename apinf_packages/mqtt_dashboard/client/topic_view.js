/* Copyright 2017 Apinf Oy
  This file is covered by the EUPL license.
  You may obtain a copy of the licence at
  https://joinup.ec.europa.eu/community/eupl/og_page/european-union-public-licence-eupl-v11 */

import { ReactiveVar } from 'meteor/reactive-var';
import { Meteor } from 'meteor/meteor';
import { Template } from 'meteor/templating';

import { getParticularTopicData } from '../lib/es_requests';
import moment from 'moment';
import AclRules from '../collection';
import { getDateRange } from './helpers';

Template.topicPage.onCreated(function () {
// Subscription
  const instance = this;

  let subscription;
  this.dataType = new ReactiveVar('message_published');
  this.aggregatedData = new ReactiveVar();
  this.chartType = new ReactiveVar('real-time');
  this.timeframe = new ReactiveVar('1');
  this.topic = new ReactiveVar();
  this.totalNumber = new ReactiveVar(0);
  instance.trend = new ReactiveVar({});

  // Subscrube to ACL document
  this.autorun(() => {
    const topicId = FlowRouter.getParam('id');

    if (topicId) {
      subscription = this.subscribe('topicAclRules', topicId);

      const isReady = subscription.ready();

      if (isReady) {
        const acl = AclRules.findOne();

        const topic = acl.topic;

        // Get Even type & timeframe
        const eventType = this.dataType.get();
        const timeframe = this.timeframe.get();

        instance.queryOption = getDateRange(timeframe);

        // Create request body to fetch data for Chart and total number
        instance.requestBody = getParticularTopicData(eventType, this.queryOption, topic);
        // Send request
        instance.sendRequest();

        // console.log(JSON.stringify(instance.requestBody))

        if (timeframe === '1') {
          instance.chartType.set('real-time');

          instance.intervalId = setInterval(() => {
            this.queryOption.interval = 'minute';

            this.queryOption.from = this.queryOption.to;
            this.queryOption.to = moment(this.queryOption.from).add(60, 's').valueOf();

            // Create request body to fetch data for Chart and total number
            instance.requestBody = getParticularTopicData(eventType, this.queryOption, topic);
            // Send request
            this.sendRequest();
          }, 60000);
        } else {
          instance.chartType.set('no-real-time');

          // Turn off real-time update
          clearInterval(instance.intervalId);
        }
      }
    }
  });

  this.sendRequest = () => {
    Meteor.call('sendElastisticsearchRequest', this.requestBody, (error, result) => {
      if (error) {
        sAlert.error(error.message);
      } else {
        const elasticsearchData = result.aggregations.data_over_time.buckets;
        const totalNumber = this.totalNumber.get();

        if (this.dataType.get() === 'client_publish') {
          const pubslihedClients = publishedClients(elasticsearchData, this.queryOption.from);

          this.aggregatedData.set(pubslihedClients);

          this.totalNumber.set(totalNumber+result.aggregations.total_number.client_publish.value);
        } else {
          if (elasticsearchData.length === 0) {
            // Set
            elasticsearchData.push({
              doc_count: 0,
              key: this.queryOption.from,
            });
          }

          this.aggregatedData.set(elasticsearchData);
          this.totalNumber.set(totalNumber + result.aggregations.total_number.doc_count);
        }
      }
    });
  };
});

Template.topicPage.helpers({
  aggregatedData () {
    return Template.instance().aggregatedData.get();
  },
  topicValue () {
    return AclRules.findOne().topic;
  },
  chartType () {
    return Template.instance().chartType.get();
  },
  totalNumber () {
    return Template.instance().totalNumber.get();
  },
});

Template.topicPage.events({
  'click [name="data-type"]': (event, templateInstance) => {
    const dataType = event.currentTarget.value;
    templateInstance.dataType.set(dataType);
    templateInstance.totalNumber.set(0);
  },
  'change #date-range-picker': (event, templateInstance) => {
    const value = event.currentTarget.value;
    templateInstance.timeframe.set(value);
    templateInstance.totalNumber.set(0);
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
