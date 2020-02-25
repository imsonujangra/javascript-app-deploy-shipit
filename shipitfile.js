// shipitfile.js
module.exports = shipit => {
  // Load shipit-deploy tasks
  require('shipit-deploy')(shipit)
  require('shipit-shared')(shipit)
  require('shipit-submodule')(shipit);

  var currentPath = "/var/www/tmp/shipit-frontend-deploy";

  var Slack = require('slack-node');
  var webhookUri = "https://hooks.slack.com/services/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";
  var slack = new Slack();
  slack.setWebhook(webhookUri);

  shipit.initConfig({
    default: {
      workspace: currentPath,
      //workspace: '/tmp/shipit-folder-name',
      //updateSubmodules: true,
      deployTo: '/var/www/frontend-deploy',
      repositoryUrl: 'git@bitbucket.org:imsonujangra/loemi-frontend.git',
      // shared: {
      //   dirs: ['node_modules'],
      //   overwrite: true,
      //   triggerEvent: "updated"
      // },
      keepReleases: 2,
      rsync: ['--del'],
      shallowClone: true,
      submodules: true,
      ignores: ['.git', 'node_modules']
    },
    development: {
      branch:'master',
      servers: 'groot@192.169.12.222',
    }
  })

  shipit.blTask('submodules', async () => {
    shipit.log('Starting...');
    await shipit.local(`cd ${shipit.workspace} && git clone git@bitbucket.org:imsonujangra/girnarsoft-react-common.git`)
  });

  shipit.blTask('npm:install', async () => {
    await shipit.remote(`cd ${shipit.releasePath} && npm install && npm link gulp && npm run gulp-default:local && npm run build:local`)
  })

  shipit.blTask('server:start', async () => {
    const command = 'chmod +x loemi-frontend.sh && ./loemi-frontend.sh'
    await shipit.remote(`cd ${shipit.currentPath} && ${command}`)
  })

  shipit.blTask('server:restart', async () => {
    const command = 'forever restartall'
    await shipit.remote(`cd ${shipit.config.deployTo} && ${command}`)
  })

  shipit.blTask('server:copyConfig', async () => {
      shipit.log('copying server file :: >>>>> ');
      await shipit.remote(`cp -r /var/www/common_shared/loemi-frontend.sh ${shipit.releasePath}/`);
  })

  shipit.on('updated', () => {
    shipit.start('server:copyConfig')
    
  })

  shipit.on('fetched', () => {
    shipit.start('submodules');
    
  })

  shipit.on('published', () => {
    shipit.start('npm:install');
  })

  shipit.on('deployed', function () {
    shipit.start('server:start')
  });

  shipit.blTask('slack', function(cb){
    var workspace = shipit.config.workspace;
    shipit.local('git rev-parse HEAD', {cwd: workspace}).then(function(res) {
      let pack = {
        "name":"frontend-deploy",
        "version":"1.0.1",
        "url":"https://bitbucket.org/imsonujangra/loemi-frontend/commits/"
      };
      var githubLink = pack.url.replace('/issues',`/commit/${res.stdout}`).trim();
      slack.webhook({
            username: "Shipit",
            text: `${pack.name} v${pack.version} - Deployed to ${shipit.environment} \n#${res.stdout}\n<${githubLink}|View on GitHub>`
            }, function (err, response) {
              return console.error('upload failed:', err);
            }
      );
    });
  });

  shipit.on('cleaned', function () {
    shipit.start('slack')
});
}