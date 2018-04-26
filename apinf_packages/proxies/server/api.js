/* Copyright 2017 Apinf Oy
 This file is covered by the EUPL license.
 You may obtain a copy of the licence at
 https://joinup.ec.europa.eu/community/eupl/og_page/european-union-public-licence-eupl-v11 */

// Meteor packages imports
import { Meteor } from 'meteor/meteor';

// Meteor contributed packages imports
import { Roles } from 'meteor/alanning:roles';
import { SimpleSchema } from 'meteor/aldeed:simple-schema';

// Collection imports
import Apis from '/apinf_packages/apis/collection';
import ApiDocs from '/apinf_packages/api_docs/collection';
import Proxies from '/apinf_packages/proxies/collection';
import ProxyBackends from '/apinf_packages/proxy_backends/collection';

// APInf imports
import ProxyV1 from '/apinf_packages/rest_apis/server/proxy';
import Authentication from '/apinf_packages/rest_apis/server/authentication';
import descriptionProxies from '/apinf_packages/rest_apis/lib/descriptions/proxies_texts';
import errorMessagePayload from '/apinf_packages/rest_apis/server/rest_api_helpers';

ProxyV1.swagger.meta.paths = {
  '/login': Authentication.login,
  '/logout': Authentication.logout,
};

// Request /rest/v1/proxies for Proxies collection
ProxyV1.addCollection(Proxies, {
  routeOptions: {
    authRequired: false,
  },
  endpoints: {
    // Response contains a list of all public entities within the collection
    getAll: {
      authRequired: true,
      swagger: {
        tags: [
          ProxyV1.swagger.tags.proxy,
        ],
        summary: 'Get list of available proxies.',
        description: descriptionProxies.getProxies,
        parameters: [],
        responses: {
          200: {
            description: 'List of available proxies',
            schema: {
              type: 'object',
              properties: {
                status: {
                  type: 'string',
                  example: 'Success',
                },
                data: {
                  $ref: '#/definitions/proxyResponse',
                },
              },
            },
          },
          400: {
            description: 'Bad Request. Erroneous or missing parameter.',
          },
          401: {
            description: 'Authentication is required',
          },
          403: {
            description: 'User does not have permission',
          },
        },
        security: [
          {
            userSecurityToken: [],
            userId: [],
          },
        ],
      },
      action () {
        // Get requestor ID from header
        const requestorId = this.request.headers['x-user-id'];

        if (!requestorId) {
          return errorMessagePayload(400, 'Erroneous or missing parameter.');
        }

        // Requestor must be an administrator
        if (!Roles.userIsInRole(requestorId, ['admin'])) {
          return errorMessagePayload(403, 'User does not have permission.');
        }

        const proxyList = Proxies.find().map((proxy) => {
          return {
            id: proxy._id,
            name: proxy.name,
            type: proxy.type,
          };
        });

        // OK response with Proxy data
        return {
          statusCode: 200,
          body: {
            status: 'success',
            data: proxyList,
          },
        };
      },
    },
    // Response contains the entity with the given :id
    get: {
      authRequired: false,
      swagger: {
        tags: [
          ProxyV1.swagger.tags.proxy,
        ],
        summary: 'Fetch API with specified ID.',
        description: descriptionProxies.get,
        parameters: [
          ProxyV1.swagger.params.apiId,
        ],
        responses: {
          200: {
            description: 'API found successfully',
            schema: {
              type: 'object',
              properties: {
                status: {
                  type: 'string',
                  example: 'success',
                },
                data: {
                  $ref: '#/definitions/apiResponse',
                },
              },
            },
          },
          204: {
            description: 'No data to return',
          },
          404: {
            description: 'API is not Found',
          },
        },
      },
      action () {
        const apiId = this.urlParams.id;

        // Fetch the API matching with condition
        const api = Apis.findOne({ _id: apiId });
        // Return error response, it API is not found.
        if (!api) {
          return errorMessagePayload(404, 'API with specified ID is not found.');
        }

        // Check if user is Admin or Manager
        let userCanManage = false;
        // Get requestor ID from header
        const requestorId = this.request.headers['x-user-id'];

        if (requestorId) {
          // Check if requestor is administrator
          const requestorIsAdmin = Roles.userIsInRole(requestorId, ['admin']);
          // Check if requestor is manager
          const requestorIsManager = api.currentUserCanManage(requestorId);
          userCanManage = requestorIsAdmin || requestorIsManager;
        }

        // Only Public APIs are available for non-admin/non-manager user
        if (api.isPublic === false) {
          if (!userCanManage) {
            return {
              statusCode: 204,
              body: {
                status: 'success',
              },
            };
          }
        }

        // Extend API structure with correct link to API logo
        if (api.apiLogoFileId) {
          api.logoUrl = api.logoUrl();
        }

        // Instead of API URL, return API Proxy's URL, if it exists
        const proxyBackend = ProxyBackends.findOne({ apiId: api._id });

        // If Proxy is API Umbrella, fill in proxy URL
        if (proxyBackend && proxyBackend.type === 'apiUmbrella') {
          // Get connected proxy url
          const proxyUrl = proxyBackend.proxyUrl();
          // Get proxy backend path
          const frontendPrefix = proxyBackend.frontendPrefix();

          // Manager can see also actual API URL
          if (userCanManage) {
            api.backendURL = api.url;
            api.backendPrefix = proxyBackend.backendPrefix();

            // Get name and type of proxy
            const proxy = Proxies.findOne(proxyBackend.proxyId);
            if (proxy) {
              api.proxyName = proxy.name;
              api.proxyType = proxy.type;
            }
          }

          // Provide full proxy path
          api.url = proxyUrl.concat(frontendPrefix);
        }

        // Get URl of Swagger specification
        api.documentationUrl = api.documentationUrl();
        // Get URL to external site with API documentation
        api.externalDocumentation = api.otherUrl();

        // Construct response
        return {
          statusCode: 200,
          body: {
            status: 'success',
            data: api,
          },
        };
      },
    },
    // Create a new API
    post: {
      authRequired: true,
      swagger: {
        tags: [
          ProxyV1.swagger.tags.proxy,
        ],
        summary: 'Add new API to catalog.',
        description: descriptionProxies.post,
        parameters: [
          ProxyV1.swagger.params.api,
        ],
        responses: {
          201: {
            description: 'API added successfully',
            schema: {
              type: 'object',
              properties: {
                status: {
                  type: 'string',
                  example: 'Success',
                },
                data: {
                  $ref: '#/definitions/apiResponse',
                },
              },
            },
          },
          400: {
            description: 'Bad Request. Erroneous or missing parameter.',
          },
          401: {
            description: 'Authentication is required',
          },
          500: {
            description: 'Internal server error',
          },
        },
        security: [
          {
            userSecurityToken: [],
            userId: [],
          },
        ],
      },
      action () {
        const userId = this.userId;
        const bodyParams = this.bodyParams;

        // Include also user ID into DB
        bodyParams.created_by = userId;

        // structure for validating values against schema
        const validateFields = {
          name: bodyParams.name,
          url: bodyParams.url,
          description: bodyParams.description,
          lifecycleStatus: bodyParams.lifecycleStatus,
        };

        // Name is a required field
        if (!bodyParams.name) {
          return errorMessagePayload(400, 'Parameter "name" is mandatory.');
        }

        // Validate name
        let isValid = Apis.simpleSchema().namedContext().validateOne(
          validateFields, 'name');

        if (!isValid) {
          return errorMessagePayload(400, 'Parameter "name" is erroneous.');
        }

        // URL is a mandatory field
        if (!bodyParams.url) {
          return errorMessagePayload(400, 'Parameter "url" is mandatory.');
        }

        // Validate URL
        isValid = Apis.simpleSchema().namedContext().validateOne(
          validateFields, 'url');

        if (!isValid) {
          return errorMessagePayload(400, 'Parameter "url" must be a valid URL with http(s).');
        }

        // Check if API with same name already exists
        const duplicateApi = Apis.findOne({ name: bodyParams.name });

        if (duplicateApi) {
          const detailLine = 'Duplicate: API with same name already exists.';
          return errorMessagePayload(400, detailLine, 'id', duplicateApi._id);
        }

        // Description must not exceed field length in DB
        if (bodyParams.description) {
          isValid = Apis.simpleSchema().namedContext().validateOne(
            validateFields, 'description');

          if (!isValid) {
            return errorMessagePayload(400, 'Description length must not exceed 1000 characters.');
          }
        }

        // Is value of lifecycle status allowed
        if (bodyParams.lifecycleStatus) {
          isValid = Apis.simpleSchema().namedContext().validateOne(
            validateFields, 'lifecycleStatus');

          if (!isValid) {
            return errorMessagePayload(400, 'Parameter lifecycleStatus has erroneous value.');
          }
        }

        // Is the API set to public or private
        const isPublicParam = bodyParams.isPublic;

        if (isPublicParam) {
          if (isPublicParam === 'true') {
            bodyParams.isPublic = true;
          } else if (isPublicParam === 'false') {
            bodyParams.isPublic = false;
          } else {
            return errorMessagePayload(400, 'Parameter isPublic has erroneous value.');
          }
        }

        const documentationUrl = bodyParams.documentationUrl;
        const externalDocumentation = bodyParams.externalDocumentation;
        // Regex for http(s) protocol
        const regex = SimpleSchema.RegEx.Url;

        // Documentation URL must have URL format
        if (documentationUrl) {
          // Check link validity
          if (!regex.test(documentationUrl)) {
            // Error message
            const message = 'Parameter "documentationUrl" must be a valid URL with http(s).';
            return errorMessagePayload(400, message);
          }
        }

        // Link to an external site must have URL format
        if (externalDocumentation) {
          // Check link validity
          if (!regex.test(externalDocumentation)) {
            // Error message
            const message = 'Parameter "externalDocumentation" must be a valid URL with http(s).';
            return errorMessagePayload(400, message);
          }
        }

        // Get formed slug
        const slugData = Meteor.call('formSlugFromName', 'Apis', bodyParams.name);
        let apiData = {};
        // If formed slug true
        if (slugData && typeof slugData === 'object') {
          // Add manager IDs list into and slug
          apiData = Object.assign({ managerIds: [userId] }, bodyParams, slugData);
        } else {
          return errorMessagePayload(500, 'Forming slug for API failed.');
        }

        // Insert API data into collection
        const apiId = Apis.insert(apiData);

        // If insert failed, stop and send response
        if (!apiId) {
          return errorMessagePayload(500, 'Insert API card into database failed.');
        }

        // Add also documentation, if links are given
        if (documentationUrl || externalDocumentation) {
          const result = ApiDocs.insert({
            apiId,
            type: 'url',
            remoteFileUrl: documentationUrl,
            otherUrl: [externalDocumentation],
          });
          // Integrity: If insertion of document link failed, remove also API card
          if (result === 0) {
            // Remove newly created API document
            Meteor.call('removeApi', apiId);
            return errorMessagePayload(500, 'Insert documentation failed. API card not created.');
          }
        }

        // Prepare data to response, extend it with Documentation URLs
        const responseData = Object.assign(
          Apis.findOne(apiId),
          { documentationUrl, externalDocumentation });

        // Give user manager role
        Roles.addUsersToRoles(userId, 'manager');

        return {
          statusCode: 201,
          body: {
            status: 'success',
            data: responseData,
          },
        };
      },
    },
    // Modify the entity with the given :id with the data contained in the request body.
    put: {
      authRequired: true,
      // manager role is required. If a user already has an API then the user has manager role
      roleRequired: ['manager', 'admin'],
      swagger: {
        tags: [
          ProxyV1.swagger.tags.proxy,
        ],
        summary: 'Update API.',
        description: descriptionProxies.put,
        parameters: [
          ProxyV1.swagger.params.apiId,
          ProxyV1.swagger.params.api,
        ],
        responses: {
          200: {
            description: 'API updated successfully',
            schema: {
              type: 'object',
              properties: {
                status: {
                  type: 'string',
                  example: 'Success',
                },
                data: {
                  $ref: '#/definitions/apiResponse',
                },
              },
            },
          },
          400: {
            description: 'Bad Request. Erroneous or missing parameter.',
          },
          401: {
            description: 'Authentication is required',
          },
          403: {
            description: 'User does not have permission',
          },
          404: {
            description: 'API is not found',
          },
        },
        security: [
          {
            userSecurityToken: [],
            userId: [],
          },
        ],
      },
      action () {
        // Used in case of rollback
        let previousDocumentationUrl;

        // Get data from body parameters
        const bodyParams = this.bodyParams;
        // Get ID of API
        const apiId = this.urlParams.id;
        // Get current user ID
        const userId = this.userId;

        // Find API with specified ID
        const api = Apis.findOne(apiId);

        // API doesn't exist
        if (!api) {
          return errorMessagePayload(404, 'API with specified ID is not found.');
        }

        // API exists but user can not manage
        if (!api.currentUserCanManage(userId)) {
          return errorMessagePayload(403, 'You do not have permission for editing this API.');
        }

        // If API name given, check if API with same name already exists
        if (bodyParams.name) {
          const duplicateApi = Apis.findOne({ name: bodyParams.name });

          if (duplicateApi) {
            const detailLine = 'Duplicate: API with same name already exists.';
            return errorMessagePayload(400, detailLine, 'id', duplicateApi._id);
          }

          // Get formed slug
          const slugData = Meteor.call('formSlugFromName', 'Apis', bodyParams.name);
          // Check slugData
          if (slugData && typeof slugData === 'object') {
            // Include slug
            bodyParams.slug = slugData.slug;
            // Include friendlySlugs
            bodyParams.friendlySlugs = slugData.friendlySlugs;
          } else {
            return errorMessagePayload(500, 'Forming slug for API failed!');
          }
        }

        // validate values
        const validateFields = {
          description: bodyParams.description,
          lifecycleStatus: bodyParams.lifecycleStatus,
        };

        // Description must not exceed field length in DB
        if (bodyParams.description) {
          const isValid = Apis.simpleSchema().namedContext().validateOne(
            validateFields, 'description');

          if (!isValid) {
            return errorMessagePayload(400, 'Description length must not exceed 1000 characters.');
          }
        }

        // Is value of lifecycle status allowed
        if (bodyParams.lifecycleStatus) {
          const isValid = Apis.simpleSchema().namedContext().validateOne(
            validateFields, 'lifecycleStatus');

          if (!isValid) {
            return errorMessagePayload(400, 'Parameter lifecycleStatus has erroneous value.');
          }
        }

        // Is the API set to public or private
        const isPublicParam = bodyParams.isPublic;

        if (isPublicParam) {
          if (isPublicParam === 'true') {
            bodyParams.isPublic = true;
          } else if (isPublicParam === 'false') {
            bodyParams.isPublic = false;
          } else {
            return errorMessagePayload(400, 'Parameter isPublic has erroneous value.');
          }
        }
        // Check if link for openAPI documentation was given
        const documentationUrl = bodyParams.documentationUrl;
        // Check if link for external documentation was given
        const externalDocumentation = bodyParams.externalDocumentation;

        if (documentationUrl || externalDocumentation) {
          // Try to fetch existing documentation
          const apiDoc = ApiDocs.findOne({ apiId });
          // Regex for http(s) protocol
          const regex = SimpleSchema.RegEx.Url;

          // Check link to Documentation URL
          if (documentationUrl) {
            // Check link validity
            if (!regex.test(documentationUrl)) {
              // Error message
              const message = 'Parameter "documentationUrl" must be a valid URL with http(s).';
              return errorMessagePayload(400, message);
            }
          }

          // Check link to an external documentation
          if (externalDocumentation) {
            // Check link validity
            if (!regex.test(externalDocumentation)) {
              // Error message
              const message = 'Parameter "externalDocumentation" must be a valid URL with http(s).';
              return errorMessagePayload(400, message);
            }

            // Check if new external documentation link can be added
            if (apiDoc && apiDoc.otherUrl) {
              // Can not add same link again
              const isLinkAlreadyPresent = apiDoc.otherUrl.includes(externalDocumentation);
              if (isLinkAlreadyPresent) {
                const message = 'Same link to "externalDocumentation" already exists.';
                return errorMessagePayload(400, message, 'url', externalDocumentation);
              }
              // Max 8 external documentation links can be added
              if (apiDoc.otherUrl.length > 7) {
                const message = 'Maximum number of external documentation links (8) already given.';
                return errorMessagePayload(400, message);
              }
            }
            // Prepare for rollback of openAPI documentation after possible failure
            if (apiDoc && apiDoc.remoteFileUrl) {
              previousDocumentationUrl = apiDoc.remoteFileUrl;
            }
          }

          // Update Documentation (or create a new one)
          const result = ApiDocs.update(
            { apiId },
            { $set: {
              type: 'url',
              remoteFileUrl: bodyParams.documentationUrl,
            },
              $push: { otherUrl: bodyParams.externalDocumentation } },
            // If apiDocs document did not exist, create a new one
            { upsert: true },
          );
          // If update/insert of document link(s) failed
          if (result === 0) {
            return errorMessagePayload(500, 'Update failed because Documentation update fail.');
          }
        }

        // Include user ID here so it can be filled to DB correspondingly
        // Note! Meteor.userId is not available!
        bodyParams.updated_by = userId;

        // Update API document
        const result = Apis.update(apiId, { $set: bodyParams });
        // Check if API update failed
        if (result === 0) {
          // Try to rollback documentation update, if necessary
          if (documentationUrl || externalDocumentation) {
            if (documentationUrl) {
              // Restore previous openAPI documentation link, if it exists
              if (previousDocumentationUrl) {
                ApiDocs.update(
                  { apiId },
                  { $set: {
                    type: 'url',
                    remoteFileUrl: previousDocumentationUrl,
                  },
                  },
              );
              } else {
                // No previous link, just make it empty
                ApiDocs.update(
                  { apiId },
                  { $unset: {
                    remoteFileUrl: '',
                  },
                  },
                );
              }
            }
            // Rollback external documentation by removing latest added link
            if (externalDocumentation) {
              ApiDocs.update(
                { apiId },
                { $set: {
                  type: 'url',
                },
                  $pull: { otherUrl: externalDocumentation } },
              );
            }
          }
          return errorMessagePayload(500, 'Update failed because API update fail.');
        }

        // Prepare data to response, extend it with Documentation URLs
        const responseData = Object.assign(
          // Get updated value of API
          Apis.findOne(apiId),
          // Get updated values of Documentation urls
          {
            externalDocumentation: api.otherUrl(),
            documentationUrl: api.documentationUrl(),
          });


        // Instead of API URL, return API Proxy's URL, if it exists
        const proxyBackend = ProxyBackends.findOne({ apiId: api._id });

        // If Proxy is API Umbrella, fill in proxy URL
        if (proxyBackend && proxyBackend.type === 'apiUmbrella') {
          // Get connected proxy url
          const proxyUrl = proxyBackend.proxyUrl();
          // Get proxy backend path
          const frontendPrefix = proxyBackend.frontendPrefix();
          // Display also actual API URL
          responseData.backendURL = responseData.url;
          responseData.backendPrefix = proxyBackend.backendPrefix();

          // Get name of proxy
          const proxy = Proxies.findOne(proxyBackend.proxyId);
          if (proxy) {
            responseData.proxyName = proxy.name;
            responseData.proxyType = proxy.type;
          }

          // Provide full proxy path
          responseData.url = proxyUrl.concat(frontendPrefix);
        }

        // OK response with API data
        return {
          statusCode: 200,
          body: {
            status: 'success',
            data: responseData,
          },
        };
      },
    },
    // Remove an API
    delete: {
      authRequired: true,
      // manager role is required. If a user already has an API then the user has manager role
      roleRequired: ['manager', 'admin'],
      swagger: {
        tags: [
          ProxyV1.swagger.tags.proxy,
        ],
        summary: 'Delete API.',
        description: descriptionProxies.delete,
        parameters: [
          ProxyV1.swagger.params.apiId,
        ],
        responses: {
          204: {
            description: 'API removed successfully.',
          },
          401: {
            description: 'Authentication is required',
          },
          403: {
            description: 'User does not have permission',
          },
          404: {
            description: 'API is not found',
          },
        },
        security: [
          {
            userSecurityToken: [],
            userId: [],
          },
        ],
      },
      action () {
        // Get ID of API
        const apiId = this.urlParams.id;
        // Get User ID
        const userId = this.userId;
        // Get API document
        const api = Apis.findOne(apiId);

        // API must exist
        if (!api) {
          // API doesn't exist
          return errorMessagePayload(404, 'API with specified ID is not found.');
        }

        // User must be able to manage API
        if (!api.currentUserCanManage(userId)) {
          return errorMessagePayload(403, 'User does not have permission to remove this API.');
        }

        // Remove API document
        Meteor.call('removeApi', api._id);

        // No content with 204
        return {
          statusCode: 204,
          body: {
            status: 'success',
            message: 'API removed',
          },
        };
      },
    },
  },
});