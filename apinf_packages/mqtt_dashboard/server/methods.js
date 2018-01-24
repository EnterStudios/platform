/* Copyright 2017 Apinf Oy
  This file is covered by the EUPL license.
  You may obtain a copy of the licence at
  https://joinup.ec.europa.eu/community/eupl/og_page/european-union-public-licence-eupl-v11 */

import { Meteor } from 'meteor/meteor';

import { Client as ESClient } from 'elasticsearch';

Meteor.methods({
  async sendElastisticsearchRequest (requestBody) {
    check(requestBody, Object);

    const host = 'http://84.20.148.204:9200';

    const query = {
      index: 'mqtt',
      size: 0,
      body: requestBody,
    };

    // Initialize Elasticsearch client, using provided host value
    const esClient = new ESClient({ host });

    try {
      return await esClient.search(query);
    } catch (e) {
      // Throw an error message
      throw new Meteor.Error(e.message);
    }
  },
});
