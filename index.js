var _            = require('lodash')
  ,  request     = require('request')
  ,  util        = require('./util')
  ,  querystring = require('querystring')
  ,  pickInputs  = {
       list_id: {
            key: 'list_id',
            validate: {
                req: true,
                check: 'checkAlphanumeric'
            }
        },
        email_address: {
            key: 'email_address',
            validate: {
                req: true
            }
        },
        email_type: 'email_type',
        status: {
            key: 'status',
            validate: {
                req: true
            }
        },
        merge_fields: {
            key: 'merge_fields'
        },
        language: 'language',
        vip: 'vip'
    },
    pickOutputs = {
        id: 'id',
        email_address: 'email_address',
        unique_email_id: 'unique_email_id',
        email_type: 'email_type',
        status: 'status',
        merge_fields: 'merge_fields',
        language: 'language',
        _links: '_links'
    }
;

module.exports = {
    /**
     * The main entry point for the Dexter module
     *
     * @param {AppStep} step Accessor for the configuration for the step using this module.  Use step.input('{key}') to retrieve input data.
     * @param {AppData} dexter Container for all data used in this workflow.
     */
    run: function(step, dexter) {
        var accessToken    = dexter.provider('mailchimp').credentials('access_token')
          , dc             = dexter.provider('mailchimp').data('dc')
          , inputs         = util.pickInputs(step, pickInputs)
          , validateErrors = util.checkValidateErrors(inputs, pickInputs)
        ;

        if (validateErrors)
            return this.fail(validateErrors);

        if (inputs.status) {
            var checkStatusArray = inputs.status.split(/[\s,]+/);
            if(_.difference(checkStatusArray, ['subscribed', 'unsubscribed', 'cleaned', 'pending']).length !== 0) {
                return this.fail('[status]. Possible values: "subscribed", "unsubscribed", "cleaned", "pending"');
            }
        }

        var newInputs = _.omit(inputs, 'list_id')
          , uri       = 'lists/' + inputs.list_id + '/members'
          , baseUrl   = 'https://' + dc + '.api.mailchimp.com/3.0/'
        ;

        request({
            method    : 'POST'
            , baseUrl : baseUrl
            , uri     : uri
            , json    : true
            , body    : newInputs
            , auth    : { "bearer" : accessToken }
        }, function (error, response, body) {
            if (!error && response.statusCode == 200) {
                this.complete(util.pickOutputs(body, pickOutputs));
            } else {
                this.fail(error || body);
            }
        }.bind(this));
    }
};
