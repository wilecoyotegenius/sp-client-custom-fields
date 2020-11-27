/**
 * @file PropertyFieldSPFolderPickerHost.tsx
 * Renders the controls for PropertyFieldSPFolderPicker component
 *
 * @copyright 2016 Olivier Carpentier
 * Released under MIT licence
 */
import * as React from 'react';
import { Environment, EnvironmentType } from '@microsoft/sp-core-library';
import { IWebPartContext } from '@microsoft/sp-webpart-base';
import { SPHttpClient, SPHttpClientResponse } from '@microsoft/sp-http';
import { IPropertyFieldSPFolderPickerPropsInternal } from './PropertyFieldSPFolderPicker';
import { Label } from 'office-ui-fabric-react/lib/Label';
import { TextField } from 'office-ui-fabric-react/lib/TextField';
import { IconButton, DefaultButton, PrimaryButton, CommandButton, IButtonProps } from 'office-ui-fabric-react/lib/Button';
import { Dialog, DialogType } from 'office-ui-fabric-react/lib/Dialog';
import { Spinner, SpinnerType } from 'office-ui-fabric-react/lib/Spinner';
import { List } from 'office-ui-fabric-react/lib/List';
import { Async } from 'office-ui-fabric-react/lib/Utilities';

import * as strings from 'sp-client-custom-fields/strings';

/**
 * @interface
 * PropertyFieldSPFolderPickerHost properties interface
 *
 */
export interface IPropertyFieldSPFolderPickerHostProps extends IPropertyFieldSPFolderPickerPropsInternal {
}

/**
 * @interface
 * Interface to define the state of the rendering control
 *
 */
export interface IPropertyFieldSPFolderPickerHostState {
  isOpen: boolean;
  loading: boolean;
  currentSPFolder?: string;
  childrenFolders?: ISPFolders;
  selectedFolder?: string;
  confirmFolder?: string;
  errorMessage?: string;
}

/**
 * @class
 * Renders the controls for PropertyFieldSPFolderPicker component
 */
export default class PropertyFieldSPFolderPickerHost extends React.Component<IPropertyFieldSPFolderPickerHostProps, IPropertyFieldSPFolderPickerHostState> {

  private currentPage: number = 0;
  private pageItemCount: number = 6;

  private latestValidateValue: string;
  private async: Async;
  private delayedValidate: (value: string) => void;

  /**
   * @function
   * Constructor
   */
  constructor(props: IPropertyFieldSPFolderPickerHostProps) {
    super(props);
    //Bind the current object to the external called methods
    this.onBrowseClick = this.onBrowseClick.bind(this);
    this.onDismiss = this.onDismiss.bind(this);
    this.onRenderCell = this.onRenderCell.bind(this);
    this.onClickNext = this.onClickNext.bind(this);
    this.onClickPrevious = this.onClickPrevious.bind(this);
    this.onClickLink = this.onClickLink.bind(this);
    this.onClickParent = this.onClickParent.bind(this);
    this.onFolderChecked = this.onFolderChecked.bind(this);
    this.onClickSelect = this.onClickSelect.bind(this);
    this.onClearSelectionClick = this.onClearSelectionClick.bind(this);

    //Inits the intial folders
    var initialFolder: string;
    var currentSPFolder: string = '';
    if (props.baseFolder != null)
      currentSPFolder = props.baseFolder;
    if (props.initialFolder != null && props.initialFolder != '') {
      initialFolder = props.initialFolder;
      currentSPFolder = this.getParentFolder(initialFolder);
    }
    //Inits the state
    this.state = {
      isOpen: false,
      loading: true,
      currentSPFolder: currentSPFolder,
      confirmFolder: initialFolder,
      selectedFolder: initialFolder,
      childrenFolders: { value: [] },
      errorMessage: ''
    };

    this.async = new Async(this);
    this.validate = this.validate.bind(this);
    this.notifyAfterValidate = this.notifyAfterValidate.bind(this);
    this.delayedValidate = this.async.debounce(this.validate, this.props.deferredValidationTime);
  }

  /**
   * @function
   * Function called when the user wants to browse folders
   */
  private onBrowseClick(): void {
    this.currentPage = 0;
    this.LoadChildrenFolders();
  }

  /**
   * @function
   * Function called when the user erase the current selection
   */
  private onClearSelectionClick(): void {
    this.state.confirmFolder = '';
    this.state.currentSPFolder = '';
    if (this.props.baseFolder != null)
      this.state.currentSPFolder = this.props.baseFolder;
    this.currentPage = 0;
    this.setState({ isOpen: false, loading: true, selectedFolder: this.state.selectedFolder, currentSPFolder: this.state.currentSPFolder, childrenFolders: this.state.childrenFolders });
    this.delayedValidate(this.state.confirmFolder);
  }

  /**
   * @function
   * Loads the sub folders from the current
   */
  private LoadChildrenFolders(): void {
    //Loading
    this.state.childrenFolders = { value: [] };
    this.setState({ isOpen: true, loading: true, selectedFolder: this.state.selectedFolder, currentSPFolder: this.state.currentSPFolder, childrenFolders: this.state.childrenFolders });
    //Inits the service
    var folderService: SPFolderPickerService = new SPFolderPickerService(this.props.context);
    folderService.getFolders(this.state.currentSPFolder, this.currentPage, this.pageItemCount).then((response: ISPFolders) => {
      //Binds the results
      this.state.childrenFolders = response;
      this.setState({ isOpen: true, loading: false, selectedFolder: this.state.selectedFolder, currentSPFolder: this.state.currentSPFolder, childrenFolders: this.state.childrenFolders });
    });
  }

  /**
   * @function
   * User clicks on the previous button
   */
   private onClickPrevious(): void {
     this.currentPage = this.currentPage - 1;
     this.state.selectedFolder = '';
     if (this.currentPage < 0)
      this.currentPage = 0;
     this.LoadChildrenFolders();
  }

  /**
   * @function
   * User clicks on the next button
   */
  private onClickNext(): void {
    this.state.selectedFolder = '';
    this.currentPage = this.currentPage + 1;
    this.LoadChildrenFolders();
  }

  /**
   * @function
   * User clicks on a sub folder
   */
  private onClickLink(element?: any): void {
    this.currentPage = 0;
    this.state.selectedFolder = '';
    this.state.currentSPFolder = element.currentTarget.value;
    this.LoadChildrenFolders();
  }

  /**
   * @function
   * User clicks on the go-to parent button
   */
  private onClickParent(): void {
    var parentFolder: string = this.getParentFolder(this.state.currentSPFolder);
    if (parentFolder == this.props.context.pageContext.web.serverRelativeUrl)
      parentFolder = '';
    this.currentPage = 0;
    this.state.selectedFolder = '';
    this.state.currentSPFolder = parentFolder;
    this.LoadChildrenFolders();
  }

  /**
   * @function
   * Gets the parent folder server relative url from a folder url
   */
  private getParentFolder(folderUrl: string): string {
    var splitted = folderUrl.split('/');
    var parentFolder: string = '';
    for (var i = 0; i < splitted.length -1; i++) {
      var node: string = splitted[i];
      if (node != null && node != '') {
        parentFolder += '/';
        parentFolder += splitted[i];
      }
    }
    return parentFolder;
  }

  /**
   * @function
   * Occurs when the selected folder changed
   */
  private onFolderChecked(element?: any): void {
    this.state.selectedFolder = element.currentTarget.value;
    this.setState({ isOpen: true, loading: false, selectedFolder: this.state.selectedFolder, currentSPFolder: this.state.currentSPFolder, childrenFolders: this.state.childrenFolders });
  }

  /**
   * @function
   * User clicks on Select button
   */
  private onClickSelect(): void {
    this.state.confirmFolder = this.state.selectedFolder;
    this.state = { isOpen: false, loading: false, selectedFolder: this.state.selectedFolder,
      confirmFolder: this.state.selectedFolder,
      currentSPFolder: this.state.currentSPFolder,
      childrenFolders: this.state.childrenFolders };
    this.setState(this.state);
    this.delayedValidate(this.state.confirmFolder);
  }

  /**
   * @function
   * Validates the new custom field value
   */
  private validate(value: string): void {
    if (this.props.onGetErrorMessage === null || this.props.onGetErrorMessage === undefined) {
      this.notifyAfterValidate(this.props.initialFolder, value);
      return;
    }

    if (this.latestValidateValue === value)
      return;
    this.latestValidateValue = value;

    var result: string | PromiseLike<string> = this.props.onGetErrorMessage(value || '');
    if (result !== undefined) {
      if (typeof result === 'string') {
        if (result === undefined || result === '')
          this.notifyAfterValidate(this.props.initialFolder, value);
        this.state.errorMessage = result;
        this.setState(this.state);
      }
      else {
        result.then((errorMessage: string) => {
          if (errorMessage === undefined || errorMessage === '')
            this.notifyAfterValidate(this.props.initialFolder, value);
          this.state.errorMessage = errorMessage;
          this.setState(this.state);
        });
      }
    }
    else {
      this.notifyAfterValidate(this.props.initialFolder, value);
    }
  }

  /**
   * @function
   * Notifies the parent Web Part of a property value change
   */
  private notifyAfterValidate(oldValue: string, newValue: string) {
    if (this.props.onPropertyChange && newValue != null) {
      this.props.properties[this.props.targetProperty] = newValue;
      this.props.onPropertyChange(this.props.targetProperty, oldValue, newValue);
      if (!this.props.disableReactivePropertyChanges && this.props.render != null)
        this.props.render();
    }
  }

  /**
   * @function
   * Called when the component will unmount
   */
  public componentWillUnmount() {
    this.async.dispose();
  }

  /**
   * @function
   * User close the dialog wihout saving
   */
  private onDismiss(ev?: React.MouseEvent<any>): any {
    this.setState({ isOpen: false, loading: false, selectedFolder: this.state.selectedFolder, currentSPFolder: this.state.currentSPFolder, childrenFolders: this.state.childrenFolders });
  }

  /**
   * @function
   * Renders the controls
   */
  public render(): JSX.Element {

    var currentFolderisRoot: boolean = false;
    if (this.state.currentSPFolder == null || this.state.currentSPFolder == '' || this.state.currentSPFolder == this.props.baseFolder)
      currentFolderisRoot = true;

    //Renders content
    return (
      <div>
        <Label>{this.props.label}</Label>
         <table style={{width: '100%', borderSpacing: 0}}>
          <tbody>
            <tr>
              <td width="*">
                <TextField
                  disabled={this.props.disabled}
                  style={{width:'100%'}}
                  readOnly={true}
                  value={this.state.confirmFolder} />
              </td>
              <td width="64">
                <table style={{width: '100%', borderSpacing: 0}}>
                  <tbody>
                    <tr>
                      <td><IconButton disabled={this.props.disabled} icon={ 'FolderSearch' } onClick={this.onBrowseClick} /></td>
                      <td><IconButton disabled={this.props.disabled} icon={ 'Delete' } onClick={this.onClearSelectionClick} /></td>
                    </tr>
                  </tbody>
                </table>
              </td>
            </tr>
          </tbody>
        </table>

        { this.state.errorMessage != null && this.state.errorMessage != '' && this.state.errorMessage != undefined ?
              <div style={{paddingBottom: '8px'}}><div aria-live='assertive' className='ms-u-screenReaderOnly' data-automation-id='error-message'>{  this.state.errorMessage }</div>
              <span>
                <p className='ms-TextField-errorMessage ms-u-slideDownIn20'>{ this.state.errorMessage }</p>
              </span>
              </div>
            : ''}

        <Dialog type={DialogType.close} title={strings.SPFolderPickerDialogTitle} isOpen={this.state.isOpen} isDarkOverlay={true} isBlocking={false} onDismiss={this.onDismiss}>

            <div style={{ height: '330px'}}>
                { this.state.loading ? <div><Spinner type={ SpinnerType.normal } /></div> : null }

                { this.state.loading === false && currentFolderisRoot === false ? <IconButton onClick={this.onClickParent} icon={ 'Reply' }>...</IconButton> : null }

                <List items={this.state.childrenFolders.value}  onRenderCell={this.onRenderCell} />
                { this.state.loading === false ?
                <IconButton icon={ 'CaretLeft8' } onClick={this.onClickPrevious}
                  disabled={ this.currentPage > 0 ? false : true }
                  />
                : null }
                { this.state.loading === false ?
                <IconButton icon={ 'CaretRight8' } onClick={this.onClickNext}
                  disabled={ this.state.childrenFolders.value.length < this.pageItemCount ? true : false }
                   />
                : null }
            </div>

            <div style={{marginTop: '20px'}}>

              <PrimaryButton disabled={this.state.selectedFolder != null && this.state.selectedFolder != '' ? false : true }
                onClick={this.onClickSelect}>{strings.SPFolderPickerSelectButton}</PrimaryButton>
              <DefaultButton onClick={this.onDismiss}>{strings.SPFolderPickerCancelButton}</DefaultButton>
            </div>

        </Dialog>
      </div>
    );
  }

  /**
   * @function
   * Renders a list cell
   */
  private onRenderCell(item?: any, index?: number): React.ReactNode {
    var idUnique: string = 'radio-' + item.ServerRelativeUrl;
    return (
      <div style={{fontSize: '14px', padding: '4px'}}>
        <div className="ms-ChoiceField">
          <input id={idUnique} style={{width: '18px', height: '18px'}}
            defaultChecked={item.ServerRelativeUrl === this.state.confirmFolder ? true: false}
            aria-checked={item.ServerRelativeUrl === this.state.confirmFolder ? true: false}
            onChange={this.onFolderChecked} type="radio" name="radio1" value={item.ServerRelativeUrl}/>
          <label htmlFor={idUnique} >
            <span className="ms-Label">
              <i className="ms-Icon ms-Icon--FolderFill" style={{color: '#0062AF', fontSize: '22px'}}></i>
              <span style={{paddingLeft: '5px'}}>
                <CommandButton style={{paddingBottom: '0', height: '27px'}} value={item.ServerRelativeUrl} onClick={this.onClickLink}>
                  <span className="ms-Button-label">
                    {item.Name}
                  </span>
                </CommandButton>
              </span>
            </span>
          </label>
        </div>
      </div>
    );
  }

}


/**
 * @interface
 * Defines a collection of SharePoint folders
 */
export interface ISPFolders {
  value: ISPFolder[];
}

/**
 * @interface
 * Defines a SharePoint folder
 */
export interface ISPFolder {
  Name: string;
  ServerRelativeUrl: string;
}

/**
 * @class
 * Service implementation to get folders from current SharePoint site
 */
class SPFolderPickerService {

  private context: IWebPartContext;

  /**
   * @function
   * Service constructor
   */
  constructor(pageContext: IWebPartContext){
      this.context = pageContext;
  }

  /**
   * @function
   * Gets the collection of sub folders of the given folder
   */
  public getFolders(parentFolderServerRelativeUrl?: string, currentPage?: number, pageItemCount?: number): Promise<ISPFolders> {
    if (Environment.type === EnvironmentType.Local) {
      //If the running environment is local, load the data from the mock
      return this.getFoldersMock(parentFolderServerRelativeUrl);
    }
    else {
      //If the running environment is SharePoint, request the folders REST service
      var queryUrl: string = this.context.pageContext.web.absoluteUrl;
      var skipNumber = currentPage * pageItemCount;
      if (parentFolderServerRelativeUrl == null || parentFolderServerRelativeUrl == '' || parentFolderServerRelativeUrl == '/') {
        //The folder is the web root site
        queryUrl += "/_api/web/folders?$select=Name,ServerRelativeUrl&$orderBy=Name&$top=";
        queryUrl += pageItemCount;
        queryUrl += "&$skip=";
        queryUrl += skipNumber;
      }
      else {
        //Loads sub folders
        queryUrl += "/_api/web/GetFolderByServerRelativeUrl('";
        queryUrl += parentFolderServerRelativeUrl;
        queryUrl += "')/folders?$select=Name,ServerRelativeUrl&$orderBy=Name&$top=";
        queryUrl += pageItemCount;
        queryUrl += "&$skip=";
        queryUrl += skipNumber;
      }
      return this.context.spHttpClient.get(queryUrl, SPHttpClient.configurations.v1).then((response: SPHttpClientResponse) => {
          return response.json();
      });
    }
  }

  /**
   * @function
   * Returns 3 fake SharePoint folders for the Mock mode
   */
  private getFoldersMock(parentFolderServerRelativeUrl?: string): Promise<ISPFolders> {
    return SPFolderPickerMockHttpClient.getFolders(this.context.pageContext.web.absoluteUrl).then(() => {
          const listData: ISPFolders = {
              value:
              [
                  { Name: 'Mock Folder One', ServerRelativeUrl: '/mockfolderone' },
                  { Name: 'Mock Folder Two', ServerRelativeUrl: '/mockfoldertwo' },
                  { Name: 'Mock Folder Three', ServerRelativeUrl: '/mockfolderthree' }
              ]
          };
          return listData;
      }) as Promise<ISPFolders>;
  }

}


/**
 * @class
 * Defines a http client to request mock data to use the web part with the local workbench
 */
class SPFolderPickerMockHttpClient {

    /**
     * @var
     * Mock SharePoint result sample
     */
    private static _results: ISPFolders = { value: []};

    /**
     * @function
     * Mock get folders method
     */
    public static getFolders(restUrl: string, options?: any): Promise<ISPFolders> {
      return new Promise<ISPFolders>((resolve) => {
            resolve(SPFolderPickerMockHttpClient._results);
        });
    }

}
