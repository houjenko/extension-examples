import '../style/index.css'
import {
  JupyterFrontEnd,
  JupyterFrontEndPlugin
} from '@jupyterlab/application';
import { INotebookTracker } from '@jupyterlab/notebook';
import { LabIcon } from '@jupyterlab/ui-components';
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

    async function checkGitHubFileExists(filePath: string, token: string) {
      const url = `https://api.github.com/repos/intel-sandbox/jupyterlite/contents/content/${filePath}`;

      try {
        const response = await fetch(url, { headers: {'Authorization': `token ${token}`} });
        if (response.status === 200) {
          // File exists
          return true;
        } else if (response.status === 404) {
          // File not found
          return false;
        } else {
          // Other error (e.g., unauthorized, rate limit exceeded)
          console.error(`Error checking file existence: ${response.status} - ${response.statusText}`);
          return false; // Or throw an error
        }
      } catch (error) {
        console.error('Network error or other issue:', error);
        return false;
      }
    }

    async function callNewPR(data: string, filepath: string) {
      require('dotenv').config();
      const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
      checkGitHubFileExists(filepath, GITHUB_TOKEN)
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
