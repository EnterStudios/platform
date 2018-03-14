/* Copyright 2017 Apinf Oy
This file is covered by the EUPL license.
You may obtain a copy of the licence at
https://joinup.ec.europa.eu/community/eupl/og_page/european-union-public-licence-eupl-v11 */

// Meteor packages imports
import { Meteor } from 'meteor/meteor';
import { Accounts } from 'meteor/accounts-base';

// Meteor contributed packages imports
import { Roles } from 'meteor/alanning:roles';

// Collection imports
import Organizations from '/apinf_packages/organizations/collection/index';

// APInf imports
import ManagementV1 from '/apinf_packages/rest_apis/server/management';
import Authentication from '/apinf_packages/rest_apis/server/authentication';
import descriptionUsers from '/apinf_packages/rest_apis/lib/descriptions/users_texts';
import errorMessagePayload from '/apinf_packages/rest_apis/server/rest_api_helpers';

// Npm packages imports
import _ from 'lodash';

ManagementV1.swagger.meta.paths = {
  '/login': Authentication.login,
  '/logout': Authentication.logout,
  '/users': {
    get: {
      tags: [
        ManagementV1.swagger.tags.users,
      ],
      summary: 'List and search users.',
      description: descriptionUsers.get,
      produces: ['application/json'],
      parameters: [
        ManagementV1.swagger.params.optionalSearch,
        ManagementV1.swagger.params.userOrganizationId,
        ManagementV1.swagger.params.skip,
        ManagementV1.swagger.params.limit,
        ManagementV1.swagger.params.sortBy,
      ],
      responses: {
        200: {
          description: 'Users found',
          schema: {
            type: 'object',
            properties: {
              status: {
                type: 'string',
                example: 'success',
              },
              data: {
                type: 'array',
                items: {
                  $ref: '#/definitions/userItem',
                },
              },
            },
          },
        },
        400: {
          description: 'Bad Request. Missing or erroneous parameter.',
        },
        401: {
          description: 'Authentication is required',
        },
      },
      security: [
        {
          userSecurityToken: [],
          userId: [],
        },
      ],
    },
    post: {
      tags: [
        ManagementV1.swagger.tags.users,
      ],
      summary: 'Adds a new user.',
      description: descriptionUsers.post,
      produces: ['application/json'],
      parameters: [
        ManagementV1.swagger.params.userDataAdd,
      ],
      responses: {
        201: {
          description: 'User account added successfully',
          schema: {
            type: 'object',
            properties: {
              status: {
                type: 'string',
                example: 'success',
              },
              data: {
                $ref: '#/definitions/userPostResponse',
              },
            },
          },
        },
        400: {
          description: 'Bad Request. Missing or erroneous parameter.',
        },
        401: {
          description: 'Authentication is required',
        },
      },
    },
  },
  '/users/updates': {
    get: {
      tags: [
        ManagementV1.swagger.tags.users,
      ],
      summary: 'List and search user based on addition date.',
      description: descriptionUsers.getUpdates,
      produces: ['application/json'],
      parameters: [
        ManagementV1.swagger.params.since,
        ManagementV1.swagger.params.userOrganizationId,
        ManagementV1.swagger.params.skip,
        ManagementV1.swagger.params.limit,
      ],
      responses: {
        200: {
          description: 'Users found',
          schema: {
            type: 'object',
            properties: {
              status: {
                type: 'string',
                example: 'success',
              },
              data: {
                type: 'array',
                items: {
                  $ref: '#/definitions/userItem',
                },
              },
            },
          },
        },
        400: {
          description: 'Bad Request. Missing or erroneous parameter.',
        },
        401: {
          description: 'Authentication is required',
        },
      },
      security: [
        {
          userSecurityToken: [],
          userId: [],
        },
      ],
    },
  },
  '/users/{id}': {
    get: {
      tags: [
        ManagementV1.swagger.tags.users,
      ],
      summary: 'Search User with userID.',
      description: descriptionUsers.getId,
      produces: ['application/json'],
      parameters: [
        ManagementV1.swagger.params.userId,
      ],
      responses: {
        200: {
          description: 'User found',
          schema: {
            type: 'object',
            properties: {
              status: {
                type: 'string',
                example: 'success',
              },
              data: {
                $ref: '#/definitions/userItem',
              },
            },
          },
        },
        401: {
          description: 'Authentication is required',
        },
        403: {
          description: 'User does not have permission.',
        },
        404: {
          description: 'User is not found',
        },
      },
      security: [
        {
          userSecurityToken: [],
          userId: [],
        },
      ],
    },
    delete: {
      tags: [
        ManagementV1.swagger.tags.users,
      ],
      summary: 'Remove Users one by one with userID.',
      description: descriptionUsers.deleteId,
      parameters: [
        ManagementV1.swagger.params.userId,
      ],
      responses: {
        204: {
          description: 'User account removed successfully.',
        },
        400: {
          description: 'Bad Request. Missing or erroneous parameter.',
        },
        401: {
          description: 'Authentication is required',
        },
        403: {
          description: 'User does not have permission',
        },
        404: {
          description: 'User is not found',
        },
      },
      security: [
        {
          userSecurityToken: [],
          userId: [],
        },
      ],
    },
    put: {
      tags: [
        ManagementV1.swagger.tags.users,
      ],
      summary: 'Update User\'s data.',
      description: descriptionUsers.putId,
      parameters: [
        ManagementV1.swagger.params.userId,
        ManagementV1.swagger.params.userDataUpdate,
      ],
      responses: {
        200: {
          description: 'User updates successfully',
          schema: {
            type: 'object',
            properties: {
              status: {
                type: 'string',
                example: 'success',
              },
              data: {
                $ref: '#/definitions/userItem',
              },
            },
          },
        },
        400: {
          description: 'Bad Request. Missing or erroneous parameter.',
        },
        401: {
          description: 'Authentication is required',
        },
        403: {
          description: 'User does not have permission',
        },
        404: {
          description: 'User is not found',
        },
      },
      security: [
        {
          userSecurityToken: [],
          userId: [],
        },
      ],
    },
  },
  '/users/{id}/roles': {
    post: {
      tags: [
        ManagementV1.swagger.tags.users,
      ],
      summary: 'Add a specified role to a User.',
      description: descriptionUsers.postUserRole,
      produces: ['application/json'],
      parameters: [
        ManagementV1.swagger.params.userId,
        ManagementV1.swagger.params.addRole,
      ],
      responses: {
        201: {
          description: 'A role added successfully',
          schema: {
            type: 'object',
            properties: {
              status: {
                type: 'string',
                example: 'success',
              },
              data: {
                $ref: '#/definitions/userPostResponse',
              },
            },
          },
        },
        400: {
          description: 'Bad Request. Missing or erroneous parameter.',
        },
        401: {
          description: 'Authentication is required',
        },
        403: {
          description: 'User does not have permission',
        },
        404: {
          description: 'User is not found',
        },
      },
      security: [
        {
          userSecurityToken: [],
          userId: [],
        },
      ],
    },
    delete: {
      tags: [
        ManagementV1.swagger.tags.users,
      ],
      summary: 'Remove a specified role from a User.',
      description: descriptionUsers.deleteUserRole,
      parameters: [
        ManagementV1.swagger.params.userId,
        ManagementV1.swagger.params.removeRole,
      ],
      responses: {
        204: {
          description: 'User account removed successfully.',
        },
        400: {
          description: 'Bad Request. Missing or erroneous parameter.',
        },
        401: {
          description: 'Authentication is required',
        },
        403: {
          description: 'User does not have permission',
        },
        404: {
          description: 'User is not found',
        },
      },
      security: [
        {
          userSecurityToken: [],
          userId: [],
        },
      ],
    },
  },
};

// Generates: POST on /rest/v1/users and GET, DELETE /rest/v1/users/:id for
// Meteor.users collection
ManagementV1.addCollection(Meteor.users, {
  excludedEndpoints: [],
  routeOptions: {
    authRequired: true,
  },
  endpoints: {
    getAll: {
      authRequired: true,
      action () {
        const queryParams = this.queryParams;

        const query = {};
        const options = {};
        const searchCondition = {};
        const excludeFields = {};
        let searchOnlyWithOwnId = false;
        // Get requestor's id
        const requestorId = this.userId;

        // Check if requestor is administrator
        const requestorIsAdmin = Roles.userIsInRole(requestorId, ['admin']);

        if (!requestorIsAdmin) {
          searchOnlyWithOwnId = true;
        }

        // parse query parameters
        if (searchOnlyWithOwnId) {
          query._id = requestorId;
        } else if (queryParams.organization_id) {
          // Get organization document with specified ID
          const organization = Organizations.findOne(queryParams.organization_id);

          // Make sure Organization exists
          if (organization) {
            // Get list of manager IDs
            query._id = { $in: organization.managerIds };
          }
        }

        if (queryParams.limit) {
          // Parse query parameters
          const limit = parseInt(queryParams.limit, 10);

          // Make sure limit parameters only accept integer
          if (!Number.isInteger(limit)) {
            return errorMessagePayload(400,
              'Bad query parameters value. Limit parameters only accept integer.');
          }
          options.limit = limit;
        } else {
          // By default 100 users is returned
          options.limit = 100;
        }

        if (queryParams.skip) {
          // Parse query parameters
          const skip = parseInt(queryParams.skip, 10);

          // Make sure skip parameters only accept integer
          if (!Number.isInteger(skip)) {
            return errorMessagePayload(400,
              'Bad query parameters value. Skip parameters only accept integer.');
          }
          options.skip = skip;
        }

        // By default users are sorted by username
        if (!queryParams.sort_by ||
            queryParams.sort_by === 'username' ||
            _.includes(queryParams.sort_by, 'username')) {
          searchCondition.username = 1;
          options.sort = searchCondition;
        }

        if (queryParams.sort_by === 'created_at' ||
            _.includes(queryParams.sort_by, 'created_at')) {
          searchCondition.createdAt = 1;
          options.sort = searchCondition;
        }

        // This will be used when organization name is returned in first find
        // Needs also rethinking what to do in case there are several organizations
        if (queryParams.sort_by === 'organization' ||
            _.includes(queryParams.sort_by, 'organization')) {
          searchCondition.organizationName = 1;
          options.sort = searchCondition;
        }

        // This will be in use when timestamp for user update is taken in use
        if (queryParams.sort_by === 'updated_at' ||
            _.includes(queryParams.sort_by, 'updated_at')) {
          searchCondition.updatedAt = 1;
          options.sort = searchCondition;
        }

        // Pass an optional search string for looking up inventory.
        if (queryParams.q) {
          query.$or = [
            {
              username: {
                $regex: queryParams.q,
                $options: 'i', // case-insensitive option
              },
            },
            {
              'profile.company': {
                $regex: queryParams.q,
                $options: 'i', // case-insensitive option
              },
            },
            {
              'emails.address': {
                $regex: queryParams.q,
                $options: 'i', // case-insensitive option
              },
            },
          ];
        }

        // Exclude password
        excludeFields.services = 0;
        options.fields = excludeFields;

        // Get all users
        const userList = Meteor.users.find(query, options).fetch();
        // Get Organization names and ids for every User
        if (userList) {
          // Loop through user list one by one
          userList.forEach((userData) => {
            // Array for Organization name and id
            const orgDataList = [];
            // Get user id
            const userId = userData._id;
            // Find all Organizations, where User belongs to
            const organizations = Organizations.find({
              managerIds: userId,
            }).fetch();
            // If there are Users' Organizations
            if (organizations.length > 0) {
              // Loop through Users' Organizations
              organizations.forEach((organization) => {
                const orgData = {};
                // Put Organization name and id into an object
                orgData.organizationId = organization._id;
                orgData.organizationName = organization.name;
                // Add this Organization data into Users' organization data list
                orgDataList.push(orgData);
              });
              // Add Organizations' information to Users' data
              userData.organization = orgDataList;
            }
          });
        }
        // Construct response
        return {
          statusCode: 200,
          body: {
            status: 'success',
            data: userList,
          },
        };
      },
    },

    get: {
      authRequired: true,
      action () {
      // Get requestor's id
        const requestorId = this.userId;

        const userIsGettingOwnAccount = this.urlParams.id === requestorId;

        const userIsAdmin = Roles.userIsInRole(requestorId, ['admin']);

        if (!userIsGettingOwnAccount && !userIsAdmin) {
          return errorMessagePayload(403, 'User does not have permission.');
        }

        // Get ID of User to be fetched
        const userId = this.urlParams.id;

        // Exclude password from response
        const options = {};
        const excludeFields = {};

        excludeFields.services = 0;
        options.fields = excludeFields;

        // Check if user exists
        const user = Meteor.users.findOne(userId, options);
        if (!user) {
          return errorMessagePayload(404, 'No user found with given UserID.');
        }

        // Array for Organization name and id
        const orgDataList = [];
        // Get user id
        const userIdSearch = user._id;
        // Find all Organizations, where User belongs to
        const organizations = Organizations.find({
          managerIds: userIdSearch,
        }).fetch();
        // If there are Users' Organizations
        if (organizations.length > 0) {
          // Loop through Users' Organizations
          organizations.forEach((organization) => {
            const orgData = {};
            // Put Organization name and id into an object
            orgData.organizationId = organization._id;
            orgData.organizationName = organization.name;
            // Add this Organization data into Users' organization data list
            orgDataList.push(orgData);
          });
          // Add Organizations' information to Users' data
          user.organization = orgDataList;
        }
        // Construct response
        return {
          statusCode: 200,
          body: {
            status: 'success',
            data: user,
          },
        };
      },
    },

    post: {
      authRequired: false,
      action () {
        // Get data from body parameters
        const bodyParams = this.bodyParams;
        const options = {};
        const excludeFields = {};

        // structure for validating values against schema
        const validateFields = {
          username: this.bodyParams.username,
          'emails.$.address': this.bodyParams.email,
        };

        // Validate username
        let isValid = Meteor.users.simpleSchema().namedContext().validateOne(
          validateFields, 'username');

        if (!isValid) {
          return errorMessagePayload(400, 'Parameter "username" is erroneous.');
        }

        // Validate email address
        isValid = Meteor.users.simpleSchema().namedContext().validateOne(
          validateFields, 'emails.$.address');

        if (!isValid) {
          return errorMessagePayload(400, 'Parameter "email" is erroneous.');
        }

        // PSW must be at least 6 characters long
        if (bodyParams.password.length < 6) {
          return errorMessagePayload(400, 'Password minimum length is 6.');
        }

        // Does username already exist
        let userExists = Meteor.users.findOne({ username: bodyParams.username });

        if (!userExists) {
          // Is email address already in use
          userExists = Meteor.users.findOne({ 'emails.address': bodyParams.email });
        }

        // Either username or email is already in use
        if (userExists) {
          return errorMessagePayload(400, 'User already exists.');
        }

        // Create a new user
        Accounts.createUser({
          username: bodyParams.username,
          email: bodyParams.email,
          password: bodyParams.password,
        });

        // Do not include password in response
        excludeFields.services = 0;
        options.fields = excludeFields;

        return {
          statusCode: 201,
          body: {
            status: 'success',
            data: Meteor.users.findOne({ username: bodyParams.username }, options),
          },
        };
      },
    },
    // Delete a user
    delete: {
      authRequired: true,
      action () {
        // Get requestor's id
        const requestorId = this.userId;

        const userIsEditingOwnAccount = this.urlParams.id === requestorId;

        const userIsAdmin = Roles.userIsInRole(requestorId, ['admin']);

        // User must be either admin or modifying own account
        if (!userIsEditingOwnAccount && !userIsAdmin) {
          return errorMessagePayload(403, 'User does not have permission.');
        }

        // Get ID of User to be removed
        const userId = this.urlParams.id;
        // Check if user exists
        const user = Meteor.users.findOne(userId);
        if (!user) {
          // User didn't exist
          return errorMessagePayload(404, 'No user found with given UserID.');
        }

        // Remove user from all Organizations
        Meteor.call('removeUserFromAllOrganizations', userId);

        // Remove existing User account
        Meteor.users.remove(user._id);

        return {
          statusCode: 204,
          body: {
            status: 'success',
            message: 'User removed',
          },
        };
      },
    },
    // Udpdate user data
    put: {
      authRequired: true,
      action () {
        // Get requestor's id
        const requestorId = this.userId;

        const userIsEditingOwnAccount = this.urlParams.id === requestorId;

        // Return error in case requestor is not editing own account
        if (!userIsEditingOwnAccount) {
          return errorMessagePayload(403, 'User does not have permission.');
        }
        // Get ID of User
        const userId = this.urlParams.id;
        // Check if user to be modified exists
        const user = Meteor.users.findOne(userId);
        if (!user) {
          // User doesn't exist
          return errorMessagePayload(404, 'No user found with given UserID.');
        }

        // Get data from body parameters
        const bodyParams = this.bodyParams;
        let previousUsername;
        let previousPassword;
        let updateDone = false;

        // Are all parameters given
        if (!bodyParams.username &&
            !bodyParams.company &&
            !bodyParams.password) {
          return errorMessagePayload(400, 'No update parameters provided.');
        }

        // Check error situations before modification
        if (bodyParams.username) {
          // Check if there already is a User by the same name
          if (Accounts.findUserByUsername(bodyParams.username)) {
            return errorMessagePayload(400, 'Username already exists.');
          }
        }
        // Is there a new password
        if (bodyParams.password && (
            typeof bodyParams.password !== 'string' ||
            bodyParams.password.length < 5)) {
          return errorMessagePayload(400, 'Erroneous new password.');
        }

        // Preparations for possible failure in DB write and rollback Needs
        // rethinking

        // Try to change username
        if (bodyParams.username) {
          // Save old username for possible rollback
          previousUsername = user.username;
          // Update username
          Accounts.setUsername(userId, bodyParams.username);
          // Flag the change for response
          updateDone = true;
        }

        // Try to change password
        if (bodyParams.password) {
          // Save previous password in case restore is needed later
          previousPassword = user.services.password.bcrypt;
          Accounts.setPassword(userId, bodyParams.password);
          updateDone = true;
        }

        // Try to change company name
        if (bodyParams.company) {
          Meteor.users.update(userId, { $set: { 'profile.company': bodyParams.company } });
          // Flag the change for response
          updateDone = true;
        }
        // Successful update (one or more) is done
        if (updateDone) {
          // Prepare response
          const options = {};
          const excludeFields = {};
          // Do not include password in response
          excludeFields.services = 0;
          options.fields = excludeFields;

          return {
            statusCode: 200,
            body: {
              status: 'success',
              data: Meteor.users.findOne(userId, options),
            },
          };
        }
        // Update failed
        if (previousUsername) {
          // Restore old username
          Accounts.setUsername(userId, previousUsername);
        }

        if (previousPassword) {
          // Restore old password
          Meteor.users.update(userId, { $set: { 'services.password.bcrypt': previousPassword } });
        }
        return errorMessagePayload(400, 'User update failed!');
      },
    },
  },
});

// Request /rest/v1/users/updates for Users collection
ManagementV1.addRoute('users/updates', {
  get: {
    authRequired: true,
    roleRequired: ['admin'],
    action () {
      let badQueryParameters = false;
      // Read possible query parameters
      const queryParams = this.queryParams;

      const query = {};
      const options = {};
      const excludeFields = {};

      // parse query parameters
      if (queryParams.organization_id) {
        // Get organization document with specified ID
        const organization = Organizations.findOne(queryParams.organization_id);

        // Make sure Organization exists
        if (organization) {
          // Get list of manager IDs
          query._id = { $in: organization.managerIds };
        }
      } else {
        // Using organization ID other parameters are overridden
        if (queryParams.limit) {
          // Parse query parameters
          const limit = parseInt(queryParams.limit, 10);

          // Make sure limit parameters only accept integer
          if (!Number.isInteger(limit)) {
            return errorMessagePayload(400,
              'Bad query parameters value. Limit parameters only accept integer.');
          }
          options.limit = limit;

          if (options.limit < 1) {
            badQueryParameters = true;
          }
        } else {
          // By default 100 users is returned
          options.limit = 100;
        }

        if (queryParams.skip) {
          // Parse query parameters
          const skip = parseInt(queryParams.skip, 10);

          // Make sure skip parameters only accept integer
          if (!Number.isInteger(skip)) {
            return errorMessagePayload(400,
              'Bad query parameters value. Skip parameters only accept integer.');
          }
          options.skip = skip;

          if (options.skip < 0) {
            badQueryParameters = true;
          }
        }

        // Default value for parameter since is 7
        if (!queryParams.since) {
          queryParams.since = 7;
        }
        // Set the query for past days according to parameter since
        if (queryParams.since) {
          if (queryParams.since % 1 === 0) {
            query.createdAt = {
              $lt: new Date(),
              $gte: new Date(new Date().setDate(new Date().getDate() - queryParams.since)),
            };
          } else {
            badQueryParameters = true;
          }
        }
      }
      // Exclude password
      excludeFields.services = 0;
      options.fields = excludeFields;

      if (badQueryParameters) {
        return errorMessagePayload(400, 'Bad query parameters.');
      }
      // Get all users
      const userList = Meteor.users.find(query, options).fetch();
      // Get Organization names and ids for every User
      if (userList) {
        // Loop through user list one by one
        userList.forEach((userData) => {
          // Array for Organization name and id
          const orgDataList = [];
          // Get user id
          const userId = userData._id;
          // Find all Organizations, where User belongs to
          const organizations = Organizations.find({
            managerIds: userId,
          }).fetch();
          // If there are Users' Organizations
          if (organizations.length > 0) {
            // Loop through Users' Organizations
            organizations.forEach((organization) => {
              const orgData = {};
              // Put Organization name and id into an object
              orgData.organizationId = organization._id;
              orgData.organizationName = organization.name;
              // Add this Organization data into Users' organization data list
              orgDataList.push(orgData);
            });
            // Add Organizations' information to Users' data
            userData.organization = orgDataList;
          }
        });
      }
      // Construct response
      return {
        statusCode: 200,
        body: {
          status: 'success',
          data: userList,
        },
      };
    },

  },
});

// Request /rest/v1/users/:id/roles for User Collection
ManagementV1.addRoute('users/:id/roles', {
  delete: {
    authRequired: true,
    roleRequired: ['admin'],
    action () {
      const allowedRoles = ['manager', 'admin'];
      // Get role value
      const role = this.queryParams.role;
      // Get user id value
      const userId = this.urlParams.id;

      // Check if the parameter is not provided
      if (!role) {
        const message = 'The parameter "role" is required';
        // Return message
        return errorMessagePayload(400, message);
      }

      // Make sure the value is allowed
      if (!allowedRoles.includes(role)) {
        const message = 'The parameter "role" must be "admin" or "manager" value';
        // Return message
        return errorMessagePayload(400, message);
      }

      // Get a user with userId
      const user = Meteor.users.findOne(userId);

      // Check if the user exists
      if (!user) {
        // Return message
        return errorMessagePayload(404, 'No user found with given user ID');
      }

      // Get user roles or an empty array on default
      const userRoles = user.roles || [];

      // Check if a user does not have the role
      if (!userRoles.includes(role)) {
        return errorMessagePayload(400, 'User does not have this role');
      }

      Meteor.users.update({ _id: userId }, { $pop: { roles: role } });

      // Construct response
      return {
        statusCode: 204,
        body: {
          status: 'succes',
          data: 'Role remove',
        },
      };
    },
  },
  post: {
    authRequired: true,
    roleRequired: ['admin'],
    action () {
      const allowedRoles = ['manager', 'admin'];
      // Get role value
      const role = this.bodyParams.role;
      // Get user id value
      const userId = this.urlParams.id;

      // Check if the parameter is not provided
      if (!role) {
        const message = 'The parameter "role" is required';
        // Return message
        return errorMessagePayload(400, message);
      }

      // Make sure the value is allowed
      if (!allowedRoles.includes(role)) {
        const message = 'The parameter "role" must be "admin" or "manager" value';
        // Return message
        return errorMessagePayload(400, message);
      }

      // Get a user with userId
      const user = Meteor.users.findOne(userId);

      // Check if the user exists
      if (!user) {
        // Return message
        return errorMessagePayload(404, 'No user found with given user ID');
      }

      // Get user roles or an empty array on default
      const userRoles = user.roles || [];

      // Check if a user has already the role
      if (userRoles.includes(role)) {
        return errorMessagePayload(400, 'User has already this role');
      }

      Meteor.users.update({ _id: userId }, { $push: { roles: role } });

      // Construct response
      return {
        statusCode: 201,
        body: {
          status: 'success',
          // Get a user with userId, excluding password value
          data: Meteor.users.findOne(userId, { fields: { services: 0 } }),
        },
      };
    },
  },
});

