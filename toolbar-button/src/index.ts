import '../style/index.css'
import {
  JupyterFrontEnd,
  JupyterFrontEndPlugin
} from '@jupyterlab/application';
import { INotebookTracker } from '@jupyterlab/notebook';
import { LabIcon } from '@jupyterlab/ui-components';
import { parse as yamlParse } from 'yaml';
import linkGenSVG from '../link.svg';
import uploadSVG from '../upload.svg';

const linkIcon = new LabIcon({
  name: 'link-icon',
  svgstr: linkGenSVG
});

const uploadIcon = new LabIcon({
  name: 'upload-icon',
  svgstr: uploadSVG
});

// dotenv.config();

const extension: JupyterFrontEndPlugin<void> = {
  id: '@jupyterlab-examples/toolbar-button:plugin',
  description:
    'A JupyterLab extension adding a button to the Notebook toolbar.',
  autoStart: true,
  requires: [INotebookTracker],
  activate: (
    app: JupyterFrontEnd,
    nbtracker: INotebookTracker
  ) => {
    const { commands } = app;

    async function callAPI(data: string) {
      const url = "https://pisa.intel.com/API/Record";
      var form = new FormData();

      form.append("Stdin", data);
      form.append("InputType", ".ipynb");

      const xhr = new XMLHttpRequest();
      xhr.open('POST', url, true);
      xhr.withCredentials = true;

      xhr.onload = function() {
        if (xhr.status === 200) {
          var SHA = xhr.responseText;
          navigator.clipboard.writeText(
            "https://wiki.intel.com/Jupyter/lab/?fromURL=https://wiki.intel.com/tmp/" + SHA +
            ".ipynb"
          );
          alert('Copied the link to the clipboard.');
          console.log(SHA);
        } else {
          console.error(xhr.statusText);
        }
      };
      xhr.send(form);
    }

    async function checkGitHubFileExists(filePath: string) {
      return new Promise((resolve) => {
        const owner = 'intel-sandbox';
        const repo = 'jupyterlite';
        const url = 'https://pisa.intel.com/API/GH/Exist';
        var form = new FormData();

        form.append("Owner", owner);
        form.append("Repo", repo);
        form.append("FilePath", 'content/' + filePath);

        const xhr = new XMLHttpRequest();
        xhr.open('POST', url, true);
        xhr.withCredentials = true;

        xhr.onload = function() {
          if (xhr.status === 200) {
            try {
              const data = yamlParse(xhr.responseText);

              // Now 'data' is a JavaScript object representing the YAML structure
              const returnCode = data.ReturnCode;

              console.log("Return Code:", returnCode);
              if (returnCode == 0)
                resolve(true);
              else
                resolve(false);
            } catch (e) {
              console.error("Error parsing YAML:", e);
              resolve(false);
            }
          } else {
            console.error('Network error or other issue');
            resolve(false);
          }
        };
        xhr.send(form);
      });
    }

    async function callNewPR(data: string, filepath: string) {
      checkGitHubFileExists(filepath)
        .then(exists => {
          var url = '';
          if (exists) {
            url = "https://github.com/intel-sandbox/jupyterlite/edit/main/content/" + filepath;
          } else {
            url = "https://github.com/intel-sandbox/jupyterlite/new/main/content/?filename=" + filepath;
          }
          navigator.clipboard.writeText(data);
          alert('Copied the Jupyter notebook to the clipboard.\nPlease paste the content to the opened page as a commit.');
          const newTab = window.open(url, '_blank');
          if (newTab) {
            newTab.focus();
          } else {
            console.error("The new tab cannot be opened");
          }
        });
    }

    commands.addCommand('jlab-examples/log-messages:logTextMessage', {
      icon: linkIcon,
      caption: 'Generate Link for this notebook.',
      execute: () => {
        if(nbtracker.currentWidget) {
          const panel = nbtracker.currentWidget;
          const content = JSON.stringify(panel.context.model.toJSON());
          callAPI(content);
        }
      }
    });

    commands.addCommand('jlab-examples/log-messages:uploadTextMessage', {
      icon: uploadIcon,
      caption: 'Publish this notebook to Github.',
      execute: () => {
        if(nbtracker.currentWidget) {
          const panel = nbtracker.currentWidget;
          const filepath = panel.context.path;
          const content = JSON.stringify(panel.context.model.toJSON());
          callNewPR(content, filepath);
        }
      }
    });
  }
};

export default extension;
