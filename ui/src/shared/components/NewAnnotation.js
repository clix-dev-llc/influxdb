import React, {Component, PropTypes} from 'react'
import classnames from 'classnames'
import {connect} from 'react-redux'
import uuid from 'node-uuid'

import OnClickOutside from 'shared/components/OnClickOutside'
import AnnotationWindow from 'shared/components/AnnotationWindow'
import * as schema from 'shared/schemas'
import * as actions from 'shared/actions/annotations'

class NewAnnotation extends Component {
  state = {
    isMouseOver: false,
    gatherMode: 'startTime',
  }

  enforceGraphBounds = newTime => {
    const {dygraph} = this.props
    const xRangeStart = dygraph.xAxisRange()[0]

    return newTime < xRangeStart ? `${xRangeStart}` : `${newTime}`
  }

  handleMouseDown = e => {
    const {tempAnnotation, dygraph, onUpdateAnnotation} = this.props

    const wrapperRect = this.wrapper.getBoundingClientRect()
    const trueGraphX = e.pageX - wrapperRect.left
    const startTime = this.enforceGraphBounds(dygraph.toDataXCoord(trueGraphX))

    onUpdateAnnotation({...tempAnnotation, startTime})
    this.setState({gatherMode: 'endTime'})
  }

  handleMouseMove = e => {
    if (this.props.isTempHovering === false) {
      return
    }

    const {dygraph, tempAnnotation, onUpdateAnnotation} = this.props
    const wrapperRect = this.wrapper.getBoundingClientRect()
    const trueGraphX = e.pageX - wrapperRect.left
    const newTime = this.enforceGraphBounds(dygraph.toDataXCoord(trueGraphX))

    if (this.state.gatherMode === 'startTime') {
      onUpdateAnnotation({
        ...tempAnnotation,
        startTime: newTime,
        endTime: newTime,
      })
    } else {
      onUpdateAnnotation({...tempAnnotation, endTime: newTime})
    }
  }

  handleMouseUp = e => {
    const {
      addAnnotationAsync,
      onAddingAnnotationSuccess,
      onMouseLeaveTempAnnotation,
    } = this.props

    const createUrl = this.context.source.links.annotations

    const {dygraph, tempAnnotation, onUpdateAnnotation} = this.props
    const wrapperRect = this.wrapper.getBoundingClientRect()
    const trueGraphX = e.pageX - wrapperRect.left
    const upTime = this.enforceGraphBounds(dygraph.toDataXCoord(trueGraphX))

    const downTime = tempAnnotation.startTime
    const [startTime, endTime] = [downTime, upTime].sort()

    const newAnnotation = {...tempAnnotation, startTime, endTime}
    onUpdateAnnotation(newAnnotation)
    addAnnotationAsync(createUrl, {...newAnnotation, id: uuid.v4()})

    onAddingAnnotationSuccess()
    onMouseLeaveTempAnnotation()

    this.setState({
      isMouseOver: false,
      gatherMode: 'startTime',
    })
  }

  handleMouseOver = e => {
    this.setState({isMouseOver: true})
    this.handleMouseMove(e)
    this.props.onMouseEnterTempAnnotation()
  }

  handleMouseLeave = () => {
    this.setState({isMouseOver: false})
    this.props.onMouseLeaveTempAnnotation()
  }

  handleClickOutside = () => {
    const {onDismissAddingAnnotation, isTempHovering} = this.props

    if (!isTempHovering) {
      onDismissAddingAnnotation()
    }
  }

  renderTimestamp(time) {
    const timestamp = `${new Date(+time)}`

    return (
      <div className="new-annotation-tooltip">
        <span className="new-annotation-helper">Click or Drag to Annotate</span>
        <span className="new-annotation-timestamp">
          {timestamp}
        </span>
      </div>
    )
  }

  render() {
    const {
      dygraph,
      isTempHovering,
      tempAnnotation,
      tempAnnotation: {startTime, endTime},
    } = this.props

    const crosshairOne = Math.max(-1000, dygraph.toDomXCoord(startTime))
    const crosshairTwo = dygraph.toDomXCoord(endTime)

    const isDragging = startTime !== endTime
    const flagOneClass =
      crosshairOne < crosshairTwo
        ? 'annotation-span--left-flag dragging'
        : 'annotation-span--right-flag dragging'
    const flagTwoClass =
      crosshairOne < crosshairTwo
        ? 'annotation-span--right-flag dragging'
        : 'annotation-span--left-flag dragging'
    const pointFlagClass = 'annotation-point--flag__dragging'

    return (
      <div>
        {isDragging &&
          <AnnotationWindow
            annotation={tempAnnotation}
            dygraph={dygraph}
            active={true}
          />}
        <div
          className={classnames('new-annotation', {
            hover: isTempHovering,
          })}
          ref={el => (this.wrapper = el)}
          onMouseMove={this.handleMouseMove}
          onMouseOver={this.handleMouseOver}
          onMouseLeave={this.handleMouseLeave}
          onMouseUp={this.handleMouseUp}
          onMouseDown={this.handleMouseDown}
        >
          {isDragging &&
            <div
              className="new-annotation--crosshair"
              style={{left: crosshairTwo}}
            >
              {this.renderTimestamp(tempAnnotation.endTime)}
              <div className={flagTwoClass} />
            </div>}
          <div
            className="new-annotation--crosshair"
            style={{left: crosshairOne}}
          >
            {isDragging || this.renderTimestamp(tempAnnotation.startTime)}
            <div className={isDragging ? flagOneClass : pointFlagClass} />
          </div>
        </div>
      </div>
    )
  }
}

const {bool, func, shape, string} = PropTypes

NewAnnotation.contextTypes = {
  source: shape({
    links: shape({
      annotations: string,
    }),
  }),
}

NewAnnotation.propTypes = {
  dygraph: shape({}).isRequired,
  isTempHovering: bool,
  tempAnnotation: schema.annotation.isRequired,
  addAnnotationAsync: func.isRequired,
  onDismissAddingAnnotation: func.isRequired,
  onAddingAnnotationSuccess: func.isRequired,
  onUpdateAnnotation: func.isRequired,
  onMouseEnterTempAnnotation: func.isRequired,
  onMouseLeaveTempAnnotation: func.isRequired,
}

const mdtp = {
  addAnnotationAsync: actions.addAnnotationAsync,
}

export default connect(null, mdtp)(OnClickOutside(NewAnnotation))
