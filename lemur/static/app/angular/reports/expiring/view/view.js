'use strict';

angular.module('lemur')

  .config(function config($stateProvider) {
    $stateProvider.state('expiring_reports', {
      url: '/expiring_reports',
      templateUrl: '/angular/reports/expiring/view/view.tpl.html',
      controller: 'ExpiringReportsViewController'
    });
  })

   .controller('ExpiringReportsViewController', function ($q, $scope, LemurRestangular, ngTableParams, CertificateApi, MomentService) {
     $scope.showFilters = false;
     $scope.isExpriredOnly = false;
     $scope.includeExprired = false;
     $scope.params = {};
     $scope.momentService = MomentService;
     $scope.daysFilters = [
       {count: 1, label:'In 1 Day', isExprired: false},
       {count: 3, label:'In 3 Days', isExprired: false},
       {count: 7, label:'In 7 Days', isExprired: false},
       {count: 30, label:'In next Month', isExprired: false},
       {count: 60, label:'In 2 Months', isExprired: false},
       {count: 90, label:'In 3 Months', isExprired: false},
       {count: -1, label:'Last Day', isExprired: true},
       {count: -3, label:'Wihtin 3 Days', isExprired: true},
       {count: -7, label:'Wihtin 7 Days', isExprired: true},
       {count: -30, label:'Wihtin Last Month', isExprired: true},
       {count: -60, label:'Wihtin 2 Months', isExprired: true},
       {count: -90, label:'Wihtin 3 Months', isExprired: true}
     ];
     $scope.filters = [
       {sortable: 'id', show: false, title:'Id', field:'id'},
       {sortable: 'name', show: true, title:'Name', field:'name'},
       {sortable: 'cn', show: false, title:'Common Name', field:'cn'},
       {sortable: 'issuer', show: true, title:'Issuer', field:'issuer'},
       {sortable: 'notify', show: true, title:'Notify', field:'notify', type:'boolean'},
       {show: true, title:'Notification', field:'notification', type:'Notify'},
       {sortable: 'serial', show: false, title:'Serial', field:'serial'},
       {sortable: 'creator', show: true, title:'Creator', field:'creator'},
       {sortable: 'owner', show: true, title:'Owner', field:'owner'},
       {sortable: 'notBefore', show: false, title:'Valid From', field:'notBefore', type:'Date'},
       {sortable: 'notAfter', show: true, title:'Valid To', field:'notAfter', type:'Date'},
       {sortable: 'san', show: true, field: 'san', title:'SAN', type:'SAN'},
       {sortable: 'bits', show: true, title:'Key Length', field:'bits'},
       {sortable: 'keyType', show: true, title:'Key type', field:'keyType'},
       {sortable: 'signingAlgorithm', show: true, title:'Signing Algorithm', field:'signingAlgorithm'},
       {sortable: 'status', show: true, title:'Validity', field:'status'},
     ];

     $scope.toggleIsExpired = function() {
       $scope.includeExprired = false;
       $scope.isExpriredOnly = !$scope.isExpriredOnly;
       $scope.expiresInDays = - $scope.expiresInDays;
       $scope.filterData($scope.expiresInDays);
     };

     $scope.toggleInclueExpired = function() {
       $scope.includeExprired = !$scope.includeExprired;
       if ($scope.isExpriredOnly) {
         $scope.isExpriredOnly = false;
         $scope.expiresInDays = - $scope.expiresInDays;
       }
       $scope.filterData($scope.expiresInDays);
     };

     $scope.mapSan = function(data) {
       if (data.extensions &&
         data.extensions.subAltNames &&
         data.extensions.subAltNames.names &&
         data.extensions.subAltNames.names.length > 0) {
           return data.extensions.subAltNames.names.map(name => name.value).join(' , ');
       }
       return '';
     };

     $scope.mapNotify = function(data) {
       if (data.notifications) {
         const values = [];
         data.notifications.map(notification =>
           notification.options.find(option => option.name === 'recipients').value
         ).forEach((item) => {
           if (values.indexOf(item) === -1){
              values.push(item);
           }
         });
         if (values.length > 0) {
           return values.join(' , ');
         }
       }
       return '';
     };

     $scope.filterData = function (days, from, to) {
       $scope.expiresInDays = days;
       $scope.data=[];
       if (days) {
         const now = new Date();
         from = now.toISOString().substr(0,10);
         now.setDate(now.getDate() + $scope.expiresInDays);
         if (days > 0) {
           to = now.toISOString().substr(0,10);
         } else {
           to = from;
           from = now.toISOString().substr(0,10);
         }
         if ($scope.includeExprired) {
           const beforeMonth = new Date();
           beforeMonth.setDate(beforeMonth.getDate() - 30);
           from = beforeMonth.toISOString().substr(0,10);
         }
       } else {
         from = from?from.toISOString().substr(0,10):'*';
         to = to?to.toISOString().substr(0,10):'*';
       }
       const notAfterRange = `${from}to${to}`;
       LemurRestangular.all('certificates').customGET('stats', {metric: 'issuer', notAfterRange})
         .then(function (data) {
           $scope.issuers = data.items;
         });

       LemurRestangular.all('certificates').customGET('stats', {metric: 'bits', notAfterRange})
         .then(function (data) {
           $scope.bits = data.items;
         });

      LemurRestangular.all('certificates').customGET('stats', {metric: 'signing_algorithm', notAfterRange})
        .then(function (data) {
          $scope.algos = data.items;
        });

       LemurRestangular.all('destinations').customGET('stats', {metric: 'destinations', notAfterRange})
         .then(function (data) {
           $scope.destinations = data.items;
         });
         $scope.certificateTable = new ngTableParams({
           page: 1,            // sortable: '', show first page
           count: 10,          // count per page
           sorting: {
             id: 'desc'     // initial sorting
           },
           short: true
         }, {
           total: 0,           // length of data
           getData: function ($defer, params) {
             $scope.params = params.url();
             $scope.params['filter[notAfterRange]'] = notAfterRange;
             CertificateApi.getList($scope.params)
               .then(function (data) {
                 params.total(data.total);
                 $scope.data = data;
                 $defer.resolve(data);
               });
           }
         });
     };
     $scope.toggleFilter = function (filter) {
       filter.show = !filter.show;
     };
     $scope.showFilterOptions = function() {
       $scope.showFilters = !$scope.showFilters;
     };
     $scope.filterData(30);
     $scope.getData = function () {
       $scope.now = Date.now();
       var deferred = $q.defer();
       $scope.params.count = 9999999;
       CertificateApi.getList($scope.params)
         .then(function (data) {
           deferred.resolve(data.map(entry => {
             const csvData = {};
             $scope.filters
               .filter(filter=>filter.show)
               .forEach((item) => {
                 if (item.type === 'Date') {
                   csvData[item.field] = $scope.momentService.showInEST(entry[item.field]);
                 } else if (item.type === 'SAN') {
                   csvData[item.field] = $scope.mapSan(entry);
                 } else if (item.type === 'Notify') {
                   csvData[item.field] = $scope.mapNotify(entry);
                 } else if (item.field === 'serial') {
                   csvData[item.field] = "'" + entry[item.field].toString();
                 } else {
                   csvData[item.field] = entry[item.field];
                 }
               });
             return csvData;
           }));
         });
       return deferred.promise;
     };
     $scope.markWarning = function (date) {
       var now = new Date() ;
       now.setDate(now.getDate() + 7);
       return !$scope.markDanger() && now >= Date.parse(date);
     };
     $scope.markDanger = function (date) {
       var now = new Date() ;
       return now >= Date.parse(date);
     };
   });
