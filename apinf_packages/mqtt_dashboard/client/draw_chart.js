/* Copyright 2017 Apinf Oy
  This file is covered by the EUPL license.
  You may obtain a copy of the licence at
  https://joinup.ec.europa.eu/community/eupl/og_page/european-union-public-licence-eupl-v11 */
// Meteor packages imports
import { Template } from 'meteor/templating';
import { ReactiveVar } from 'meteor/reactive-var';

import moment from 'moment';

Template.drawChart.onRendered(function () {
  // const selector = this.selector;
  const querySelector = `#${this.data.query}`;
  // get document element
  const canvas = document.querySelector(querySelector);
  // Realize chart
  this.chart = new Chart(canvas.getContext('2d'), {
    // The type of chart
    type: 'line',

    // Data for displaying chart
    data: {
      labels: [],
      datasets: [
        {
          backgroundColor: '#e3f2fc',
          borderColor: '#3886d4',
          borderWidth: 2,
          data: [],
          pointRadius: 0,
          pointHoverRadius: 5,
        },
      ],
    },

    // Configuration options
    options: {
      scales: {
        xAxes: [{
          display: false,
        }],
        yAxes: [{
          display: false,
          ticks: {
            beginAtZero: true,
          },
        }],

      },
      legend: {
        display: false,
      },
      elements: {
        line: {
          tension: 0, // disables bezier curves
        },
      },
      animation: {
        duration: 0, // general animation time
      },
      hover: {
        animationDuration: 0, // duration of animations when hovering an item
      },
      responsiveAnimationDuration: 0, // animation duration after a resize
    },
  });

  this.autorun(() => {
    const aggregatedData = Template.currentData().aggregatedData;

    if (aggregatedData) {
      const chartType = this.data.chartType;

      if (chartType === 'no-real-time') {
        // If data is a point
        if (aggregatedData.length === 1) {
          // Display point
          this.chart.data.datasets[0].pointRadius = 2;
        } else {
          // Otherwise display line without point
          this.chart.data.datasets[0].pointRadius = 0;
        }

        // Create a labels
        this.chart.data.labels = aggregatedData.map(dataset => {
          return moment(dataset.key).format('DD/MM');
        });

        // Get chart dara
        this.chart.data.datasets[0].data = aggregatedData.map(dataset => {
          return dataset.doc_count;
        });
      } else {
        aggregatedData.forEach(dataset => {
          const date = moment(dataset.key).format('HH:mm:ss');

          // Add a new dataset to existing
          this.chart.data.labels.push(date);
          this.chart.data.datasets[0].data.push(dataset.doc_count);
        });
      }

      // Update chart
      this.chart.update();
    }
  });
});
