"use strict";

var assert = require("assert");

var adapter = require("../../js/bluebird_debug.js");
var fulfilled = adapter.fulfilled;
var rejected = adapter.rejected;
var pending = adapter.pending;
var Promise = adapter;

var erroneusNode = function(a, b, c, cb) {
    setTimeout(function(){
        cb(sentinelError);
    }, 10);
};

var sentinel = {};
var sentinelError = new Error();

var successNode = function(a, b, c, cb) {
    setTimeout(function(){
        cb(null, sentinel);
    }, 10);
};

var successNodeMultipleValues = function(a, b, c, cb) {
    setTimeout(function(){
        cb(null, sentinel, sentinel, sentinel);
    }, 10);
};

var syncErroneusNode = function(a, b, c, cb) {
    cb(sentinelError);
};

var syncSuccessNode = function(a, b, c, cb) {
    cb(null, sentinel);
};

var syncSuccessNodeMultipleValues = function(a, b, c, cb) {
    cb(null, sentinel, sentinel, sentinel);
};

var errToThrow;
var thrower = Promise.promisify(function(a, b, c, cb) {
    errToThrow = new Error();
    throw errToThrow;
});

var tprimitive = "Where is your stack now?";
var throwsStrings = Promise.promisify(function(cb){
    throw tprimitive;
});

var errbacksStrings = Promise.promisify(function(cb){
    cb( tprimitive );
});

var errbacksStringsAsync = Promise.promisify(function(cb){
    setTimeout(function(){
        cb( tprimitive );
    }, 13);
});

var error = Promise.promisify(erroneusNode);
var success = Promise.promisify(successNode);
var successMulti = Promise.promisify(successNodeMultipleValues);
var syncError = Promise.promisify(syncErroneusNode);
var syncSuccess = Promise.promisify(syncSuccessNode);
var syncSuccessMulti = Promise.promisify(syncSuccessNodeMultipleValues);

describe("when calling promisified function it should ", function(){


    specify("return a promise that is pending", function(done) {
        var a = error(1,2,3);
        var b = success(1,2,3);
        var c = successMulti(1,2,3);
        var d = syncError(1,2,3);
        var e = syncSuccess(1,2,3);
        var f = syncSuccessMulti(1,2,3);
        var calls = 0;
        function donecall() {
            if( (++calls) === 2 ) {
                done();
            }
        }

        assert.equal(a.isPending(), true);
        assert.equal(b.isPending(), true);
        assert.equal(c.isPending(), true);
        assert.equal(d.isPending(), true);
        assert.equal(e.isPending(), true);
        assert.equal(f.isPending(), true);
        a.caught(donecall);
        d.caught(donecall);
    });

    specify( "should use this if no receiver was given", function(done){
        var o = {};
        var fn = Promise.promisify(function(cb){

            cb(null, this === o);
        });

        o.fn = fn;

        o.fn().then(function(val){
            assert(val);
            done();
        });
    });

    specify("call future attached handlers later", function(done) {
        var a = error(1,2,3);
        var b = success(1,2,3);
        var c = successMulti(1,2,3);
        var d = syncError(1,2,3);
        var e = syncSuccess(1,2,3);
        var f = syncSuccessMulti(1,2,3);
        var calls = 0;
        function donecall() {
            if( (++calls) === 6 ) {
                done();
            }
        }

        setTimeout(function(){
            a.then(assert.fail, donecall);
            b.then(donecall, assert.fail);
            c.then(donecall, assert.fail);
            d.then(assert.fail, donecall);
            e.then(donecall, assert.fail);
            f.then(donecall, assert.fail);
        }, 100);
    });

    specify("Reject with the synchronously caught reason", function(done){
        thrower(1, 2, 3).then(assert.fail).caught(function(e){
            assert(e === errToThrow);
            done();
        });
    });

    specify("reject with the proper reason", function(done) {
        var a = error(1,2,3);
        var b = syncError(1,2,3);
        var calls = 0;
        function donecall() {
            if( (++calls) === 2 ) {
                done();
            }
        }

        a.caught(function(e){
            assert.equal( sentinelError, e);
            donecall();
        });
        b.caught(function(e){
            assert.equal( sentinelError, e);
            donecall();
        });
    });

    specify("fulfill with proper value(s)", function(done) {
        var a = success(1,2,3);
        var b = successMulti(1,2,3);
        var c = syncSuccess(1,2,3);
        var d = syncSuccessMulti(1,2,3);
        var calls = 0;
        function donecall() {
            if( (++calls) === 4 ) {
                done();
            }
        }

        a.then(function( val ){
            assert.equal(val, sentinel);
            donecall()
        });

        b.then(function( val ){
            assert.deepEqual( val, [sentinel, sentinel, sentinel] );
            donecall()
        });

        c.then(function( val ){
            assert.equal(val, sentinel);
            donecall()
        });

        d.then(function( val ){
            assert.deepEqual( val, [sentinel, sentinel, sentinel] );
            donecall()
        });
    });


});


describe("with more than 5 arguments", function(){

    var o = {
        value: 15,

        f: function(a,b,c,d,e,f,g, cb) {
            cb(null, [a,b,c,d,e,f,g, this.value])
        }

    }

    var prom = Promise.promisify(o.f, o);

    specify("receiver should still work", function(done) {
        prom(1,2,3,4,5,6,7).then(function(val){
            assert.deepEqual(
                val,
                [1,2,3,4,5,6,7, 15]
            );
            done();
        });

    });

});

describe("promisify on objects", function(){

    var o = {
        value: 15,

        f: function(a,b,c,d,e,f,g, cb) {
            cb(null, [a,b,c,d,e,f,g, this.value])
        }

    };

    var objf = function(){};

    objf.value = 15;
    objf.f = function(a,b,c,d,e,f,g, cb) {
        cb(null, [a,b,c,d,e,f,g, this.value])
    };

    function Test(data) {
        this.data = data;
    }

    Test.prototype.get = function(a, b, c, cb) {
        cb(null, a, b, c, this.data);
    };

    Test.prototype.getMany = function(a, b, c, d, e, f, g, cb) {
        cb(null, a, b, c, d, e, f, g, this.data);
    };

    Promise.promisifyAll(o);
    Promise.promisifyAll(objf);
    Promise.promisifyAll(Test.prototype);

    specify("should not repromisify", function() {
        var f = o.f;
        var fAsync = o.fAsync;
        var getOwnPropertyNames = Object.getOwnPropertyNames(o);
        var ret = Promise.promisifyAll(o);
        assert.equal(f, o.f);
        assert.equal(fAsync, o.fAsync);
        assert.deepEqual(getOwnPropertyNames, Object.getOwnPropertyNames(o));
        assert.equal(ret, o);
    });

    specify("should not repromisify function object", function() {
        var f = objf.f;
        var fAsync = objf.fAsync;
        var getOwnPropertyNames = Object.getOwnPropertyNames(objf);
        var ret = Promise.promisifyAll(objf);
        assert.equal(f, objf.f);
        assert.equal(fAsync, objf.fAsync);
        assert.deepEqual(getOwnPropertyNames, Object.getOwnPropertyNames(objf));
        assert.equal(ret, objf);
    });

    specify("should work on function objects too", function(done) {
        objf.fAsync(1, 2, 3, 4, 5, 6, 7).then(function(result){
            assert.deepEqual( result, [1, 2, 3, 4, 5, 6, 7, 15] );
            done();
        });
    });

    specify("should work on prototypes and not mix-up the instances", function(done) {
        var a = new Test(15);
        var b = new Test(30);
        var c = new Test(45);

        var calls = 0;

        function calldone() {
            calls++;
            if( calls === 3 ) {
                done();
            }
        }
        a.getAsync(1, 2, 3).then(function( result ){
            assert.deepEqual( result, [1, 2, 3, 15] );
            calldone();
        });

        b.getAsync(4, 5, 6).then(function( result ){
            assert.deepEqual( result, [4, 5, 6, 30] );
            calldone();
        });

        c.getAsync(7, 8, 9).then(function( result ){
            assert.deepEqual( result, [7, 8, 9, 45] );
            calldone();
        });
    });

    specify("should work on prototypes and not mix-up the instances with more than 5 arguments", function(done) {
        var a = new Test(15);
        var b = new Test(30);
        var c = new Test(45);

        var calls = 0;

        function calldone() {
            calls++;
            if( calls === 3 ) {
                done();
            }
        }
        a.getManyAsync(1, 2, 3, 4, 5, 6, 7).then(function( result ){
            assert.deepEqual( result, [1, 2, 3, 4, 5, 6, 7, 15] );
            calldone();
        });

        b.getManyAsync(4, 5, 6, 7, 8, 9, 10).then(function( result ){
            assert.deepEqual( result, [4, 5, 6, 7, 8, 9, 10, 30] );
            calldone();
        });

        c.getManyAsync(7, 8, 9, 10, 11, 12, 13).then(function( result ){
            assert.deepEqual( result, [7, 8, 9, 10, 11, 12, 13, 45] );
            calldone();
        });
    });

    specify( "promisify Async suffixed methods", function( done ) {
        var o = {
            x: function(cb){
                cb(null, 13);
            },
            xAsync: function(cb) {
                cb(null, 13);
            },

            xAsyncAsync: function( cb ) {
                cb(null, 13)
            }
        };

        Promise.promisifyAll(o);
        var b = {};
        var hasProp = {}.hasOwnProperty;
        for( var key in o ) {
            if( hasProp.call(o, key ) ) {
                b[key] = o[key];
            }
        }
        Promise.promisifyAll(o);
        assert.deepEqual(b, o);

        o.xAsync()
        .then(function(v){
            assert( v === 13 );
            return o.xAsyncAsync();
        })
        .then(function(v){
            assert( v === 13 );
            return o.xAsyncAsyncAsync();
        })
        .then(function(v){
            assert( v === 13 );
            done();
        });



    });
});


describe( "Promisify from prototype to object", function(){
    function makeClass() {
        var Test = (function() {

        function Test() {

        }
        var method = Test.prototype;

        method.test = function() {

        };

        return Test;})();

        return Test;
    }

    specify( "Shouldn't touch the prototype when promisifying instance", function(done) {
        var Test = makeClass();

        var origKeys = Object.getOwnPropertyNames(Test.prototype).sort();
        var a = new Test();
        Promise.promisifyAll(a);


        assert( typeof a.testAsync === "function" );
        assert( a.hasOwnProperty("testAsync"));
        assert.deepEqual( Object.getOwnPropertyNames(Test.prototype).sort(), origKeys );

        done();
    });

    specify( "Shouldn't touch the method", function(done) {
        var Test = makeClass();

        var origKeys = Object.getOwnPropertyNames(Test.prototype.test).sort();
        var a = new Test();
        Promise.promisifyAll(a);


        assert( typeof a.testAsync === "function" );
        assert.deepEqual( Object.getOwnPropertyNames(Test.prototype.test).sort(), origKeys );
        assert( Promise.promisify( a.test ) !== a.testAsync );

        done();
    });

    specify( "Should promisify own method even if a promisified method of same name already exists somewhere in proto chain", function(done){
        var Test = makeClass();
        var instance = new Test();
        Promise.promisifyAll( instance );
        var origKeys = Object.getOwnPropertyNames(Test.prototype).sort();
        var origInstanceKeys = Object.getOwnPropertyNames(instance).sort();
        instance.test = function() {};
        Promise.promisifyAll( instance );
        assert.deepEqual( origKeys, Object.getOwnPropertyNames(Test.prototype).sort() );
        assert.notDeepEqual( origInstanceKeys,  Object.getOwnPropertyNames(instance).sort() );
        done();
    });

    specify( "Shouldn promisify the method closest to the object if method of same name already exists somewhere in proto chain", function(done){
        //IF the implementation is for-in, this pretty much tests spec compliance
        var Test = makeClass();
        var origKeys = Object.getOwnPropertyNames(Test.prototype).sort();
        var instance = new Test();
        instance.test = function() {

        };
        Promise.promisifyAll(instance);

        assert.deepEqual( Object.getOwnPropertyNames(Test.prototype).sort(), origKeys );
        assert( instance.test__beforePromisified__ === instance.test );
        done();
    });

});


function assertLongStackTraces(e) {
    assert( e.stack.indexOf("From previous event:") > -1 );
}
if( Promise.hasLongStackTraces() ) {
    describe("Primitive errors wrapping", function() {
        specify("when the node function throws it", function(done){
            throwsStrings().caught(function(e){
                assert(e instanceof Error);
                assert(e.message == tprimitive);
                done();
            });
        });

        specify("when the node function throws it inside then", function(done){
            Promise.fulfilled().then(function(){
                throwsStrings().caught(function(e){
                    assert(e instanceof Error);
                    assert(e.message == tprimitive);
                    assertLongStackTraces(e);
                    done();
                });
            });
        });


        specify("when the node function errbacks it synchronously", function(done){
            errbacksStrings().caught(function(e){
                assert(e instanceof Error);
                assert(e.message == tprimitive);
                done();
            });
        });

        specify("when the node function errbacks it synchronously inside then", function(done){
            Promise.fulfilled().then(function(){
                errbacksStrings().caught(function(e){
                    assert(e instanceof Error);
                    assert(e.message == tprimitive);
                    assertLongStackTraces(e);
                    done();
                });
            });
        });

        specify("when the node function errbacks it asynchronously", function(done){
            errbacksStringsAsync().caught(function(e){
                assert(e instanceof Error);
                assert(e.message == tprimitive);
                assertLongStackTraces(e);
                done();
            });
        });

        specify("when the node function errbacks it asynchronously inside then", function(done){
            Promise.fulfilled().then(function(){
                errbacksStringsAsync().caught(function(e){
                    assert(e instanceof Error);
                    assert(e.message == tprimitive);
                    assertLongStackTraces(e);
                    done();
                });
            });
        });
    });
}