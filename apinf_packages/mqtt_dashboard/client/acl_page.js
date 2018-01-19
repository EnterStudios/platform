/* Copyright 2017 Apinf Oy
  This file is covered by the EUPL license.
  You may obtain a copy of the licence at
  https://joinup.ec.europa.eu/community/eupl/og_page/european-union-public-licence-eupl-v11 */
import { Meteor } from 'meteor/meteor';
import { Template } from 'meteor/templating';
import { ReactiveVar } from 'meteor/reactive-var';
import { sAlert } from 'meteor/juliancwirko:s-alert';

import AclRules from '../collection/index';

const allowRules = {
  'allow': 1,
  'deny': 0
};

const accessRules = {
  'sub': 1,
  'pub': 2,
  'pubsub': 3
};


Template.aclPage.onCreated(function () {
  this.subscribe('allAclRules');

  this.params = {
    url: 'http://84.20.148.204:3000',
    path: '/mqtt_acl',
    fullUrl: 'http://84.20.148.204:3000/mqtt_acl',

  };

  this.formEdited = new ReactiveVar(false);
  this.formType = 'insert';
  this.aclId = new ReactiveVar('');
});

Template.aclPage.helpers({
  aclRules () {
    return AclRules.find({ access: { $exists: true } }).fetch();
  },
  formEdited () {
    return Template.instance().formEdited.get();
  },
  aclId () {
    return Template.instance().aclId.get();
  },
});

Template.aclPage.events({
  'submit form': (event, template) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);

    // Get data from allow & access fields
    const allowField = formData.get('allow');
    const accessField = formData.get('access');

    // Main data: is repeated everywhere
    const mainData = {
      topic: formData.get('topic'),
      username: formData.get('username'),
      ipaddr: formData.get('ipaddr'),
      clientid: formData.get('clientid'),
    };

    // Create a data to body param
    const requestData = Object.assign({
      allow: allowRules[allowField],
      access: accessRules[accessField],
    }, mainData);

    // TODO: remove it
    const pid = formData.get('id');
    if (pid) {
      requestData.id = pid;
    }

    // Create a data to mongodb store
    const collectionData = Object.assign({
      allow: allowField,
      access: accessField,
    }, mainData);

    if (template.formType === 'insert') {
      Meteor.call('addAclRule', requestData, template.params, (error, response) => {
        if (error) {
          sAlert.error(error);
        } else {
          template.formEdited.set(false);

          // Header "location" has form "/mqtt_acl?id=eq.1
          const locationHeader = response.headers.location;
          // Get ID value
          const id = locationHeader.split('.')[1];

          const insertData = Object.assign({
            starred: false,
            pid: id,
          }, collectionData);

          AclRules.insert(insertData);
        }
      });
    } else {
      // Send request
      Meteor.call('editAclRule', template.pid, template.params, requestData, (error) => {
        if (error) {
          sAlert.error(error.message);
        } else {
          template.formEdited.set(false);
          // Update in MongoDB
          AclRules.update(template.aclId.get(), { $set: collectionData });
        }
      });
    }
  },
  'click .edit': (event, template) => {
    const aclPid = event.currentTarget.dataset.pid;
    Meteor.call('getAclRule', aclPid, template.params, (error, result) => {
      console.log('result123', result)
    });
  },
  'click .acl-delete': (event, template) => {
    // PID is postgres ID
    const aclPid = event.currentTarget.dataset.pid;
    const aclId = event.currentTarget.dataset.id;

    // Send request to remove from remote Database
    Meteor.call('deleteAclRule', aclPid, template.params, (error) => {
      if (error) {
        sAlert.error(error);
      } else {
        // Remove from MongoDB
        AclRules.remove(aclId);
      }
    });
  },
  'click .acl-edit': (event, template) => {
    template.formEdited.set(true);
    template.aclId.set(event.currentTarget.dataset.id);
    template.pid = event.currentTarget.dataset.pid;
    template.formType = 'update';
  },
  'click .cancel': (event, template) => {
    template.formEdited.set(false)

  },
  'click #add-acl': (event, template) => {
    // Display form
    template.formEdited.set(true);
    template.formType = 'insert';
    template.aclId.set('');
  },
});

Template.addForm.helpers({
  aclRule () {
    console.log(Template.currentData());
    const id = Template.currentData().id;

    return AclRules.findOne(id) || {};
  }
});
