/* Copyright 2017 Apinf Oy
  This file is covered by the EUPL license.
  You may obtain a copy of the licence at
  https://joinup.ec.europa.eu/community/eupl/og_page/european-union-public-licence-eupl-v11 */

import _ from 'lodash';

import AclRules from '../../collection';
import { getTopicsData } from '../../lib/es_requests';
const a = '{"/sm5/48":{"doc_count":168643,"event_types":{"doc_count_error_upper_bound":0,"sum_other_doc_count":0,"buckets":[{"key":"message_published","doc_count":168643}]},"client_publish":{"doc_count":168643,"clients":{"doc_count_error_upper_bound":0,"sum_other_doc_count":0,"buckets":[{"key":"client1","doc_count":168643}]}}},"/sm5/76":{"doc_count":253183,"event_types":{"doc_count_error_upper_bound":0,"sum_other_doc_count":0,"buckets":[{"key":"message_published","doc_count":253183}]},"client_publish":{"doc_count":253183,"clients":{"doc_count_error_upper_bound":0,"sum_other_doc_count":0,"buckets":[{"key":"client1","doc_count":253183}]}}},"/sm5/79":{"doc_count":253897,"event_types":{"doc_count_error_upper_bound":0,"sum_other_doc_count":0,"buckets":[{"key":"message_published","doc_count":253897}]},"client_publish":{"doc_count":253897,"clients":{"doc_count_error_upper_bound":0,"sum_other_doc_count":0,"buckets":[{"key":"client1","doc_count":253897}]}}},"/sm5logger/37":{"doc_count":254383,"event_types":{"doc_count_error_upper_bound":0,"sum_other_doc_count":0,"buckets":[{"key":"message_published","doc_count":254383}]},"client_publish":{"doc_count":254383,"clients":{"doc_count_error_upper_bound":0,"sum_other_doc_count":0,"buckets":[{"key":"client1","doc_count":254383}]}}},"/sm5logger/43":{"doc_count":242411,"event_types":{"doc_count_error_upper_bound":0,"sum_other_doc_count":0,"buckets":[{"key":"message_published","doc_count":242411}]},"client_publish":{"doc_count":242411,"clients":{"doc_count_error_upper_bound":0,"sum_other_doc_count":0,"buckets":[{"key":"client1","doc_count":242411}]}}},"/sm5logger/51":{"doc_count":224626,"event_types":{"doc_count_error_upper_bound":0,"sum_other_doc_count":0,"buckets":[{"key":"message_published","doc_count":224626}]},"client_publish":{"doc_count":224626,"clients":{"doc_count_error_upper_bound":0,"sum_other_doc_count":0,"buckets":[{"key":"client1","doc_count":224626}]}}},"/sm5logger/57":{"doc_count":239395,"event_types":{"doc_count_error_upper_bound":0,"sum_other_doc_count":0,"buckets":[{"key":"message_published","doc_count":239395}]},"client_publish":{"doc_count":239395,"clients":{"doc_count_error_upper_bound":0,"sum_other_doc_count":0,"buckets":[{"key":"client1","doc_count":239395}]}}},"/sm5logger/59":{"doc_count":221089,"event_types":{"doc_count_error_upper_bound":0,"sum_other_doc_count":0,"buckets":[{"key":"message_published","doc_count":221089}]},"client_publish":{"doc_count":221089,"clients":{"doc_count_error_upper_bound":0,"sum_other_doc_count":0,"buckets":[{"key":"client1","doc_count":221089}]}}},"/sm5logger/71":{"doc_count":253015,"event_types":{"doc_count_error_upper_bound":0,"sum_other_doc_count":0,"buckets":[{"key":"message_published","doc_count":253015}]},"client_publish":{"doc_count":253015,"clients":{"doc_count_error_upper_bound":0,"sum_other_doc_count":0,"buckets":[{"key":"client1","doc_count":253015}]}}},"/sm5logger/73":{"doc_count":235627,"event_types":{"doc_count_error_upper_bound":0,"sum_other_doc_count":0,"buckets":[{"key":"message_published","doc_count":235627}]},"client_publish":{"doc_count":235627,"clients":{"doc_count_error_upper_bound":0,"sum_other_doc_count":0,"buckets":[{"key":"client1","doc_count":235627}]}}},"/sm5logger/76":{"doc_count":253183,"event_types":{"doc_count_error_upper_bound":0,"sum_other_doc_count":0,"buckets":[{"key":"message_published","doc_count":253183}]},"client_publish":{"doc_count":253183,"clients":{"doc_count_error_upper_bound":0,"sum_other_doc_count":0,"buckets":[{"key":"client1","doc_count":253183}]}}},"/sm5logger/79":{"doc_count":254014,"event_types":{"doc_count_error_upper_bound":0,"sum_other_doc_count":0,"buckets":[{"key":"message_published","doc_count":254014}]},"client_publish":{"doc_count":254014,"clients":{"doc_count_error_upper_bound":0,"sum_other_doc_count":0,"buckets":[{"key":"client1","doc_count":254014}]}}}}';

Template.displayTopicsTable.onCreated(function () {
  this.topicsList = new ReactiveVar([]);

  const filters = {
    filters: {},
  };

  const clientFilters = {
    filters: {},
  };

  this.topicsData = [];

  // Get acl rules data
  const aclRules = this.data.aclRules;

  // GO through all topics and create the filters objects
  aclRules.forEach(acl => {
    const topic = acl.topic;
    filters.filters[topic] = { prefix: { 'topic.keyword': topic } };
    const field = `topics.${topic}.qos`;

    clientFilters.filters[topic] = { term: { [field]: 0 } };

    this.topicsData.push({
      id: acl._id,
      value: acl.topic,
    });
  });

  // Create a request body
  const queryBody = getTopicsData(filters, clientFilters, { from: 1515704400000, to: 1516021029810 });

  // Send request to fetch data
  Meteor.call('sendElastisticsearchRequest', queryBody, (error, result) => {
    if (error) {
      // Display error message
      sAlert.error(error.message);
    } else {
      const messagesBucket = result.aggregations.group_by_topic.buckets;
      const clientBucket = result.aggregations.clients.buckets;

      this.topicsData.forEach(topicItem => {
        const mb = messagesBucket[topicItem.value];
        const cb = clientBucket[topicItem.value];

        topicItem.incoming = 111;
        topicItem.outgoing = 111;
        topicItem.publishedMessages = mb.message_published.doc_count;
        topicItem.deliveredMessages = 0;
        topicItem.subscribedClients = cb.client_subscribe.doc_count;
        topicItem.publishedClients = mb.message_published.client_publish.value;
      });

      this.topicsList.set(this.topicsData);
    }
  });
});

Template.displayTopicsTable.helpers({
  topicsList () {
    return Template.instance().topicsList.get();
  },
  starred (id) {
    const acl = AclRules.findOne(id);
    const starred = acl && acl.starred;

    return starred ? 'fa-star' : 'fa-star-o';
  },
});

Template.displayTopicsTable.events({
  'click .starred': (event, template) => {
    const topicId = event.currentTarget.dataset.id;

    const topicItem = AclRules.findOne(topicId);

    AclRules.update({ _id: topicId }, { $set: { starred: !topicItem.starred } });
  },
});
