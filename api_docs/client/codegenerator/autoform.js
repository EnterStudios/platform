/* Copyright 2017 Apinf Oy
This file is covered by the EUPL license.
You may obtain a copy of the licence at
https://joinup.ec.europa.eu/community/eupl/og_page/european-union-public-licence-eupl-v11 */

// Meteor packages imports
import { AutoForm } from 'meteor/aldeed:autoform';
import { HTTP } from 'meteor/http';
import { Modal } from 'meteor/peppelg:bootstrap-3-modal';
import { TAPi18n } from 'meteor/tap:i18n';
import { sAlert } from 'meteor/juliancwirko:s-alert';

// Npm packages imports
import _ from 'lodash';

AutoForm.addHooks('downloadSDK', {
  onSubmit (formValues, updateDoc, instance) {
    // Prevent form from submitting
    this.event.preventDefault();

    // Get selected language from dropdown list
    const selectedLanguage = formValues.selectLanguage;

    // Get host of code generator server
    let host = formValues.host;

    // Delete last forward slash if it exists
    if (_.endsWith(host, '/')) {
      host = host.slice(0, -1);
    }

    // Create URL to send request
    const url = `${host}/api/gen/clients/${selectedLanguage}`;


    // Create POST options with swagger file URL
    const options = {
      swaggerUrl: formValues.documentationFileURL,
    };

    // Start spinner when send request
    instance.callRequest.set(true);

    // Send POST request
    HTTP.post(url, { data: options }, (error, result) => {
      // If url is incorrect
      if (result === undefined) {
        // Get error message translation
        const message = TAPi18n.__('sdkCodeGeneratorModal_errorTextInvalidHost');

        // Alert user of error
        sAlert.error(message);
      } else {
        // Get information from Swagger API response
        const response = JSON.parse(result.content);

        if (result.statusCode === 200) {
          // Hide modal
          Modal.hide('sdkCodeGeneratorModal');

          // Go to link and download file
          window.location.href = response.link;
        } else {
          // Otherwise show an error message

          // Get error message translation
          const message = TAPi18n.__('sdkCodeGeneratorModal_errorText');

          // Alert user of error
          sAlert.error(message);
        }
      }
      $('button').removeAttr('disabled');
      // Finish spinner
      instance.callRequest.set(false);
    });
  },
});
