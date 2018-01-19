/* Copyright 2017 Apinf Oy
  This file is covered by the EUPL license.
  You may obtain a copy of the licence at
  https://joinup.ec.europa.eu/community/eupl/og_page/european-union-public-licence-eupl-v11 */
import { check } from 'meteor/check'

Meteor.methods({
  async addAclRule (data, params) {

    try {
      return await HTTP.post(params.fullUrl, { data });
    } catch (e) {
      // Throw an error message
      throw new Meteor.Error(e.response.data.details);
    }
  },
  async deleteAclRule (pid, parameters) {
    const query = `?id=eq.${pid}`;

    try {
      return await HTTP.del(parameters.fullUrl, { query });
    } catch (e) {
      // Throw an error message
      throw new Meteor.Error(e.response.data.details);
    }
  },
  async editAclRule (pid, params, data) {
    try {
      return await HTTP.call('PATCH', params.fullUrl, { params: { id: `eq.${pid}` }, data });
    } catch (e) {
      // Throw an error message
      throw new Meteor.Error(e.response.data.details);
    }
  },
  getAclRule (pid, params) {
    return new Promise((resolve, reject) => {
      HTTP.get(params.fullUrl, { params: { id: `eq.${pid}` } }, (error, result) => {
        if (error) {
          reject(error)
        } else {
          resolve(result)
        }
      });
    });
  },

});
