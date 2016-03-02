var _            = require('lodash')
  ,  request     = require('superagent')
  ,  util        = require('./util')
  ,  querystring = require('querystring')
  ,  q           = require('q')
  ,  pickInputs  = {
       list_id: {
            key: 'list_id',
            validate: {
                req: true,
                check: 'checkAlphanumeric'
            }
        },
        email_type: 'email_type',
        status: {
            key: 'status',
            validate: {
                req: true
            }
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
        language: 'language'
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
          , emails         = step.input('email_address')
          , inputs         = util.pickInputs(step, pickInputs)
          , validateErrors = util.checkValidateErrors(inputs, pickInputs)
          , self           = this
          , promises       = []
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

        _.each(emails, function(email) {
            var data = _.extend(newInputs, { email_address: email })
              , url  = baseUrl+uri
              , deferred = q.defer()
            ;

            request.post(url)
                .type('json')
                .send(data)
                .set('Authorization', 'Bearer '+accessToken)
                .end(function(err, result) {
                    deferred.resolve({
                      email: email
                      , response : result
                      , body     : result.body
                    });
                });

            promises.push(deferred.promise);
        });

        q.all(promises)
          .then(this.done.bind(this))
          .catch(this.fail.bind(this));
    }
    , done: function (results) {
        console.log('length', results.length);
        var self = this;

        self.items = [];

        _.each(results, function(result) {
            var response = result.response
              , body     = result.body
            ;

            if (response.statusCode == 200) {
                self.items.push(util.pickOutputs(body, pickOutputs));
            } else if(_.get(body,'title') === 'Member Exists') {
                self.log('Email already exists', result.email);
            } else {
                self.fail(body);
            }
        });

        self.complete(self.items);
    }
};
