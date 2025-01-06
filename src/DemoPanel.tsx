import { Component, createRef } from 'react';
import { createVis } from './planetary-brain';

export default class DemoPanel extends Component {
  state = {};

  constructor(props) {
    super(props);
    this.rootRef = createRef();
  }

  componentDidMount() {
    console.log('props are', this.props);
    createVis(
      {
        ...this.props.graphConfig,
        mapVisConfig: {
          onClick: ({ picked, object }) => this.setState({ object }),
        },
      },
      this.props.graphData,
      this.rootRef.current
    );
  }

  render() {
    return (
      <div ref={this.rootRef}>
        <div class="details-panel">{getPanelContent(this.state.object)}</div>
      </div>
    );
  }
}

function getPanelContent(object) {
  if (!object) {
    return <div class="empty-message">Select a node or link</div>;
  }
  if (isLink(object)) {
    return (
      <div>
        <div class="panel-type-label">Link</div>
        <div>
          {' '}
          <span class="from-to-label">from</span>{' '}
          {getNodeDisplay(object.source)}{' '}
        </div>
        <div>
          {' '}
          <span class="from-to-label">to</span> {getNodeDisplay(object.target)}{' '}
        </div>
      </div>
    );
  }
  return (
    <div>
      <div class="panel-type-label">Object </div> {getNodeDisplay(object)}
    </div>
  );
}

function getNodeDisplay(node) {
  return (
    <div class="node-display">
      <div class="node-header">{node.id}</div>
      <div class="node-content">index: {node.index}</div>
    </div>
  );
}

function isLink(object) {
  return object.source && object.target;
}
