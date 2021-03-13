'use strict';

angular.module('lemur')

  .config(function config($stateProvider) {

    $stateProvider
      .state('certificates', {
        url: '/certificates',
        templateUrl: '/angular/certificates/view/view.tpl.html',
        controller: 'CertificatesViewController'
      })
      .state('issuerCertificate', {
        url: '/certificates/issuer/:issuer',
        templateUrl: '/angular/certificates/view/view.tpl.html',
        controller: 'CertificatesViewController'
      })
      .state('bitsCertificate', {
        url: '/certificates/bits/:bits',
        templateUrl: '/angular/certificates/view/view.tpl.html',
        controller: 'CertificatesViewController'
      })
      .state('destinationCertificate', {
        url: '/certificates/destination/:destination',
        templateUrl: '/angular/certificates/view/view.tpl.html',
        controller: 'CertificatesViewController'
      })
      .state('signingAlgorithmCertificate', {
        url: '/certificates/signingAlgorithm/:signingAlgorithm',
        templateUrl: '/angular/certificates/view/view.tpl.html',
        controller: 'CertificatesViewController'
      });
  })

  .controller('CertificatesViewController', function ($q, $scope, $uibModal, $stateParams, CertificateApi, CertificateService, MomentService, ngTableParams, toaster) {
    $scope.showFilters = false;
    $scope.filter = $stateParams;
    $scope.expiredText = ['Show Expired', 'Hide Expired'];
    $scope.expiredValue = 0;
    $scope.expiresInDays = 0;
    $scope.expiredButton = $scope.expiredText[$scope.expiredValue];
    $scope.certificateTable = new ngTableParams({
      page: 1,            // show first page
      count: 10,          // count per page
      sorting: {
        id: 'desc'     // initial sorting
      },
      short: true,
      filter: $scope.filter
    }, {
      total: 0,           // length of data
      getData: function ($defer, params) {
        const url = params.url();
        if (url['filter[Not%20Before%20From]'] || url['filter[Not%20Before%20To]']) {
            const from = url['filter[Not%20Before%20From]']?url['filter[Not%20Before%20From]'].toISOString().substr(0,10): '*';
            const to = url['filter[Not%20Before%20To]']?url['filter[Not%20Before%20To]'].toISOString().substr(0,10): '*';
            delete url['filter[Not%20Before%20From]'];
            delete url['filter[Not%20Before%20To]'];
            url['filter[notBeforeRange]'] = from + 'to' + to;
        }
        if (url['filter[Not%20After%20From]'] || url['filter[Not%20After%20To]']) {
            const from = url['filter[Not%20After%20From]']?url['filter[Not%20After%20From]'].toISOString().substr(0,10): '*';
            const to = url['filter[Not%20After%20To]']?url['filter[Not%20After%20To]'].toISOString().substr(0,10): '*';
            delete url['filter[Not%20After%20From]'];
            delete url['filter[Not%20After%20To]'];
            url['filter[notAfterRange]'] = from + 'to' + to;
        }
        CertificateApi.getList(url)
          .then(function (data) {
            params.total(data.total);
            $defer.resolve(data);
          });
      }
    });

    $scope.showFilterOptions = function() {
      $scope.showFilters = !$scope.showFilters;
    };
    $scope.toggleFilter = function (filter) {
      filter.show = !filter.show;
    };
    $scope.getCertificateStatus = function () {
      var def = $q.defer();
      def.resolve([{'title': 'True', 'id': true}, {'title': 'False', 'id': false}]);
      return def;
    };
    $scope.filters = [
      {sortable: 'id', show: true, title:'Id', field:'id', type:'Id', filter:{'id': 'text'}},
      {sortable: 'name', show: true, title:'Name', field:'name', mutedField:'owner', filter: { 'name': 'text' } },
      {sortable: 'notify', show: true, title:'Notify', field:'notify', type:'boolean', filter: { 'notify': 'select' }, filterData:$scope.getCertificateStatus()},
      {sortable: 'notification', show: true, title:'Notification', field:'notify', type:'Notify'},
      {sortable: 'issuer', show: true, title:'Issuer', field:'issuer', filter:{ 'issuer': 'text' }},
      {sortable: 'cn', show: true, title:'Common Name', field:'cn', filter: { 'cn': 'text'}},
      {sortable: 'serial', show: false, title:'Serial', field:'serial', filter: { 'serial': 'text'}},
      {sortable: 'owner', show: false, title:'Owner', field:'owner', filter: { 'owner': 'text'}},
      {sortable: 'notBefore', show: true, title:'Not Before', field:'notBefore', type:'Date', filter: { 'Not Before From': 'date', 'Not Before To': 'date'}},
      {sortable: 'notAfter', show: true, title:'Not After', field:'notAfter', type:'Date', filter: { 'Not After From': 'date', 'Not After To': 'date'}},
      {sortable: 'san', show: false, title:'SAN', type:'SAN'},
      {sortable: 'bits', show: false, title:'Key Length', field:'bits'},
      {sortable: 'keyType', show: false, title:'Key type', field:'keyType', filter: { 'keyType': 'text'}},
      {sortable: 'signingAlgorithm', show: false, title:'Signing Algorithm', field:'signingAlgorithm', filter: { 'signingAlgorithm': 'text'}},
      {sortable: 'status', show: false, title:'Validity', field:'status', filter: { 'status': 'text'}},
    ];

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

    $scope.showExpired = function (days = 0) {
      if ($scope.expiresInDays === days) {
        $scope.expiresInDays = 0;
      } else {
        $scope.expiresInDays = days;
        $scope.expiredValue = 0;
      }
      if (days === 0) {
        if ($scope.expiredValue === 0) {
          $scope.expiredValue = 1;
        }
        else {
          $scope.expiredValue = 0;
        }
        $scope.expiredButton = $scope.expiredText[$scope.expiredValue];
      }
      $scope.certificateTable = new ngTableParams({
        page: 1,            // show first page
        count: 10,          // count per page
        sorting: {
          id: 'desc'     // initial sorting
        },
        short: true,
        filter: $scope.filter
      }, {
        getData: function ($defer, params) {
          $scope.temp = angular.copy(params.url());
          if ($scope.temp['filter[Not%20Before%20From]'] || $scope.temp['filter[Not%20Before%20To]']) {
              const from = $scope.temp['filter[Not%20Before%20From]']?$scope.temp['filter[Not%20Before%20From]'].toISOString().substr(0,10): '*';
              const to = $scope.temp['filter[Not%20Before%20To]']?$scope.temp['filter[Not%20Before%20To]'].toISOString().substr(0,10): '*';
              delete $scope.temp['filter[Not%20Before%20From]'];
              delete $scope.temp['filter[Not%20Before%20To]'];
              $scope.temp['filter[notBeforeRange]'] = from + 'to' + to;
          }
          if ($scope.temp['filter[Not%20After%20From]'] || $scope.temp['filter[Not%20After%20To]']) {
              const from = $scope.temp['filter[Not%20After%20From]']?$scope.temp['filter[Not%20After%20From]'].toISOString().substr(0,10): '*';
              const to = $scope.temp['filter[Not%20After%20To]']?$scope.temp['filter[Not%20After%20To]'].toISOString().substr(0,10): '*';
              delete $scope.temp['filter[Not%20After%20From]'];
              delete $scope.temp['filter[Not%20After%20To]'];
              $scope.temp['filter[notAfterRange]'] = from + 'to' + to;
          }
          $scope.temp.showExpired = $scope.expiredValue;
          if ($scope.expiresInDays !== 0) {
            const now = new Date();
            const from = now.toISOString().substr(0,10);
            now.setDate(now.getDate() + $scope.expiresInDays);
            const to = now.toISOString().substr(0,10);
            if ($scope.expiresInDays > 0) {
              $scope.temp['filter[notAfterRange]'] = `${from}to${to}`;
            } else {
              $scope.temp['filter[notAfterRange]'] =  `${to}to${from}`;
              $scope.temp.showExpired = 1;
            }
          }
          CertificateApi.getList($scope.temp)
            .then(function (data) {
              params.total(data.total);
              $defer.resolve(data);
            });
        }
      });
    };

    $scope.momentService = MomentService;

    $scope.remove = function (certificate) {
      certificate.remove().then(
        function () {
          $scope.certificateTable.reload();
        },
        function (response) {
          toaster.pop({
            type: 'error',
            title: certificate.name,
            body: 'Unable to remove certificate! ' + response.data.message,
            timeout: 100000
          });
        });
    };

    $scope.loadPrivateKey = function (certificate) {
      if (certificate.privateKey !== undefined) {
        return;
      }

      CertificateService.loadPrivateKey(certificate).then(
        function (response) {
          if (response.key === null) {
            toaster.pop({
              type: 'warning',
              title: certificate.name,
              body: 'No private key found!'
            });
          } else {
            certificate.privateKey = response.key;
          }
        },
        function () {
          toaster.pop({
            type: 'error',
            title: certificate.name,
            body: 'You do not have permission to view this key!',
            timeout: 100000
          });
        });
    };

    $scope.updateNotify = function (certificate) {
      CertificateService.updateNotify(certificate).then(
        function () {
          toaster.pop({
            type: 'success',
            title: certificate.name,
            body: 'Updated!'
          });
        },
        function (response) {
          toaster.pop({
            type: 'error',
            title: certificate.name,
            body: 'Unable to update! ' + response.data.message,
            timeout: 100000
          });
          certificate.notify = false;
        });
    };

    $scope.show = {title: 'Current User', value: 'currentUser'};

    $scope.fields = [{title: 'Current User', value: 'currentUser'}, {title: 'All', value: 'all'}];

    $scope.create = function () {
      var uibModalInstance = $uibModal.open({
        animation: true,
        controller: 'CertificateCreateController',
        templateUrl: '/angular/certificates/certificate/certificateWizard.tpl.html',
        size: 'lg',
        backdrop: 'static'
      });

      uibModalInstance.result.then(function () {
        $scope.certificateTable.reload();
      });
    };

    $scope.clone = function (certificateId) {
      var uibModalInstance = $uibModal.open({
        animation: true,
        controller: 'CertificateCloneController',
        templateUrl: '/angular/certificates/certificate/certificateWizard.tpl.html',
        size: 'lg',
        backdrop: 'static',
        resolve: {
          editId: function () {
            return certificateId;
          }
        }
      });

      uibModalInstance.result.then(function () {
        $scope.certificateTable.reload();
      });
    };

    $scope.edit = function (certificateId) {
      var uibModalInstance = $uibModal.open({
        animation: true,
        controller: 'CertificateEditController',
        templateUrl: '/angular/certificates/certificate/edit.tpl.html',
        size: 'lg',
        backdrop: 'static',
        resolve: {
          editId: function () {
            return certificateId;
          }
        }
      });

      uibModalInstance.result.then(function () {
        $scope.certificateTable.reload();
      });
    };

    $scope.migrate = function (certificateId) {
      var uibModalInstance = $uibModal.open({
        animation: true,
        controller: 'CertificateMigrateController',
        templateUrl: '/angular/certificates/certificate/migrate.tpl.html',
        size: 'lg',
        backdrop: 'static',
        resolve: {
          editId: function () {
            return certificateId;
          }
        }
      });

      uibModalInstance.result.then(function () {
        $scope.certificateTable.reload();
      });
    };

    $scope.import = function () {
      var uibModalInstance = $uibModal.open({
        animation: true,
        controller: 'CertificateUploadController',
        templateUrl: '/angular/certificates/certificate/upload.tpl.html',
        size: 'lg',
        backdrop: 'static'
      });

      uibModalInstance.result.then(function () {
        $scope.certificateTable.reload();
      });
    };

    $scope.export = function (certificateId) {
      $uibModal.open({
        animation: true,
        controller: 'CertificateExportController',
        templateUrl: '/angular/certificates/certificate/export.tpl.html',
        size: 'lg',
        backdrop: 'static',
        resolve: {
          editId: function () {
            return certificateId;
          }
        }
      });
    };

     $scope.revoke = function (certificate) {
      $uibModal.open({
        animation: true,
        controller: 'CertificateRevokeController',
        templateUrl: '/angular/certificates/certificate/revoke.tpl.html',
        size: 'lg',
        backdrop: 'static',
        resolve: {
          certificates: function () {
            return [certificate];
          }
        }
      });
    };
    $scope.bulkActionEnabled = false;
    $scope.showSubMenu = false;

    $scope.revokeBulk = function () {
      if ($scope.multiList.length === 0) {
        toaster.pop({
          type: 'error',
          title: 'Please Select certificates to revoke using left side checkboxs',
          body: 'lemur-bad-request',
          bodyOutputType: 'directive',
          timeout: 100000
        });
      } else {
        $uibModal.open({
          animation: true,
          controller: 'CertificateRevokeController',
          templateUrl: '/angular/certificates/certificate/revoke.tpl.html',
          size: 'lg',
          backdrop: 'static',
          resolve: {
            certificates: function () {
              return $scope.multiList;
            }
          }
        });
      }
    };
    $scope.tiggleBulkAction = function (show) {
      $scope.multiList=[];
      if (show) {
        $scope.showSubMenu = !$scope.showSubMenu;
        $scope.bulkActionEnabled = true;
      } else {
        $scope.bulkActionEnabled = false;
        $scope.showSubMenu = false;
      }
    };
    $scope.toggleMultiListSelection = function toggleMultiListSelection(certificate) {
      const multiList = $scope.multiList.filter(cert => cert.id !== certificate.id);
      if (multiList.length === $scope.multiList.length) {
        multiList.push(certificate);
      }
      $scope.multiList = multiList;
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
