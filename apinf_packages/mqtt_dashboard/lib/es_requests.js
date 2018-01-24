/* Copyright 2017 Apinf Oy
  This file is covered by the EUPL license.
  You may obtain a copy of the licence at
  https://joinup.ec.europa.eu/community/eupl/og_page/european-union-public-licence-eupl-v11 */

export function getHistogramData (eventType, dateRange) {
  return {
    query: {
      bool: {
        must: [
          {
            range: {
              timestamp: {
                gte: dateRange.from,
                lt: dateRange.to,
              },
            },
          },
          {
            term: {
              event: eventType,
            },
          },
        ],
      },
    },
    aggs: {
      data_over_time: {
        date_histogram: {
          field: 'timestamp',
          interval: dateRange.interval,
        },
      },
      total_number: {
        filter: {
          term: {
            event: eventType,
          },
        },
      },
    },
  };
}

export function getPublishedClients (dateRange) {
  return {
    query: {
      bool: {
        must: [
          {
            range: {
              timestamp: {
                gte: dateRange.from,
                lte: dateRange.to,
              },
            },
          },
          {
            term: {
              event: 'message_published',
            },
          },

        ],
      },
    },
    aggs: {
      data_over_time: {
        date_histogram: {
          field: 'timestamp',
          interval: dateRange.interval,
        },
        aggs: {
          pub_clients: {
            cardinality: {
              field: 'from.client_id.keyword',
            },
          },
        },
      },
      total_number: {
        filter: {
          term: {
            event: 'message_published',
          },
        },
        aggs: {
          pub_clients: {
            cardinality: {
              field: 'from.client_id.keyword',
            },
          },
        },
      },
    },
  };
}

export function getTopicsData (filters, clientFilters, dateRange) {
  return {
    query: {
      bool: {
        must: [
          {
            range: {
              timestamp: {
                gte: dateRange.doublePeriodAgo,
                lt: dateRange.to,
              },
            },
          },
        ],
      },
    },
    aggs: {
      group_by_interval: {
        range: {
          field: 'timestamp',
          keyed: true,
          ranges: [
            {
              key: 'previousPeriod',
              from: dateRange.doublePeriodAgo,
              to: dateRange.onePeriodAgo,
            },
            {
              key: 'currentPeriod',
              from: dateRange.onePeriodAgo,
              to: dateRange.to,
            },
          ],
        },
        aggs: {
          group_by_topic: {
            filters,
            aggs: {
              message_published: {
                filter: {
                  term: {
                    event: 'message_published',
                  },
                },
                aggs: {
                  client_publish: {
                    cardinality: {
                      field: 'from.client_id.keyword',
                    },
                  },
                },
              },
              message_delivered: {
                filter: {
                  term: {
                    event: 'message_delivered'
                  }
                }
              }
            },
          },
          clients: {
            filters: clientFilters,
            aggs: {
              client_subscribe: {
                filter: {
                  term: {
                    event: 'client_subscribe',
                  },
                },
              },
            },
          },
        },
      },
    },
  };
}

export function previousTotalNumber (dateRange) {
  return {
    query: {
      bool: {
        must: [
          {
            range: {
              timestamp: {
                gte: dateRange.doublePeriodAgo,
                lt: dateRange.to,
              },
            },
          },
        ],
      },
    },
    aggs: {
      group_by_interval: {
        range: {
          field: 'timestamp',
          keyed: true,
          ranges: [
            {
              key: 'previousPeriod',
              from: dateRange.doublePeriodAgo,
              to: dateRange.onePeriodAgo,
            },
            {
              key: 'currentPeriod',
              from: dateRange.onePeriodAgo,
              to: dateRange.to,
            },
          ],
        },
        aggs: {
          message_delivered: {
            filter: {
              term: {
                event: 'message_delivered',
              },
            },
          },
          client_subscribe: {
            filter: {
              term: {
                event: 'client_subscribe',
              },
            },
          },
          published: {
            filter: {
              term: {
                event: 'message_published',
              },
            },
            aggs: {
              pub_clients: {
                cardinality: {
                  field: 'from.client_id.keyword',
                },
              },
            },
          },
        },
      },
    },
  };
}

export function getParticularTopicData (eventType, dateRange, topicValue) {
  let topicFilter = { prefix: { 'topic.keyword': topicValue } };
  let clientPublishFilter = {};

  switch (eventType) {
    case 'client_publish':
      clientPublishFilter = {
        client_publish: {
          cardinality: { field: 'from.client_id.keyword' },
        },
      };
      break;
    case 'client_subscribe':
      topicFilter = { term: { [`topics.${topicValue}.qos`]: 0 } };
      break;
    default:
      clientPublishFilter = {};
      break;
  }

  return {
    query: {
      bool: {
        must: [
          {
            range: {
              timestamp: {
                gte: dateRange.from,
                lt: dateRange.to,
              },
            },
          },
          {
            term: {
              event: eventType,
            },
          },
          topicFilter,
        ],
      },
    },
    aggs: {
      data_over_time: {
        date_histogram: {
          field: 'timestamp',
          interval: dateRange.interval,
        },
        aggs: clientPublishFilter,
      },
    },
  };
}

export function getTopicEventTypesData (dateRange, topic) {
  return {
    query: {
      bool: {
        must: [
          {
            range: {
              timestamp: {
                gte: dateRange.from,
                lt: dateRange.to,
              },
            },
          },
        ],
      },
    },
    aggs: {
      topic_types: {
        "filter": { "prefix": { "topic.keyword": topic }},
        "aggs": {
          "message_delivered": {
            "filter": {
              "term": {
                "event": "message_delivered"
              }
            }
          },
          "message_published": {
            "filter": {
              "term": {
                "event": "message_published"
              }
            },
            "aggs": {
              "client_published": {
                "cardinality": {
                  "field": "from.client_id.keyword"
                }
              }
            }
          }
        }
      },
      client_subscribe: {
        filter: { term: { [`topics.${topic}.qos`]: 0 } },
      },
    },
  };
}
