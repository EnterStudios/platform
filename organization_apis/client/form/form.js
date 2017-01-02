import { Meteor } from 'meteor/meteor';
import { Template } from 'meteor/templating';
import { Organizations } from '/organizations/collection';
import { TAPi18n } from 'meteor/tap:i18n';
import { sAlert } from 'meteor/juliancwirko:s-alert';
import _ from 'lodash';

import { OrganizationApis } from '../../collection';

Template.organizationApisForm.onCreated(function () {
  const instance = this;

  instance.subscribe('userManagedApis');
  instance.subscribe('managedOrganizationsBasicDetails');
});

Template.organizationApisForm.helpers({
  organizationApisCollection () {
    return OrganizationApis;
  },
  organizationOptions () {
    const organizations = _.map(Organizations.find().fetch(), (organization) => ({
      label: organization.name,
      value: organization._id,
    }));
    return organizations;
  },
});

Template.organizationApisForm.events({
  'click #organization-apis-disconnect': (event, templateInstance) => {
    const organizationId = templateInstance.data.api.organization()._id;
    const apiId = templateInstance.data.api._id;

    // Get current template instance
    const instance = Template.instance();
    // Get processing message translation
    const message = TAPi18n.__('organizationApis_disconnectButton_processing');
    // Set bootstrap loadingText
    instance.$('#organization-apis-disconnect').button({ loadingText: message });
    // Set button to processing state
    instance.$('#organization-apis-disconnect').button('loading');

    Meteor.call('disconnectOrganizationApi', organizationId, apiId, (error, result) => {
      if (error) {
        // Reset button to state
        instance.$('#organization-apis-disconnect').button('reset');
        // Show error
        sAlert.error(error.reason);
      }
    });
  },
});
