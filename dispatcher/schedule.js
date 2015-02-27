/**
 * Tell the scheduler to reschedule a feed
 * --------------------------------------------------------------------
 * Handles both failure and success according to the value of the err
 * argument, which can either be an object or a numeric HTTP response code
 */
module.exports = function (feedId, errOrStatus) {
    if (typeof errOrStatus === 'number') {
        this.insist('log', 'error', {feedId: feedId, status: errOrStatus}, 'rescheduling after failure');
    } else if (errOrStatus) {
        this.insist('log', 'error', {feedId: feedId, err: errOrStatus}, 'rescheduling after failure');
    } else {
        this.insist('log', 'error', {feedId: feedId}, 'rescheduling after success');
        this.insist('redis', 'setPrevCheck', feedId, new Date().getTime());
    }

    //this.insist('', 'reschedule', feedId);
    console.log('reschedule ' + feedId);

};
