import React, {Component} from 'react';
import {OverlayTrigger, Popover} from "react-bootstrap";
import './ColorField.scss';
import InputField from "../InputField";
import validation from "../../../validation";

class ColorField extends Component {

    constructor(props) {
        super(props);

        this.state = {
        };

        this.colors = ["#E53935", "#D81B60", "#8E24AA", "#5E35B1", "#3949AB", "#1E88E5", "#039BE5", "#00ACC1",
            "#00897B", "#43A047", "#7CB342", "#9E9D24", "#F9A825", "#FB8C00", "#F4511E", "#6D4C41"];
    }

    componentDidUpdate(prevProps, prevState, snapshot) {
        if (prevProps.value !== this.props.value) {
            this.onChange(this.props.value);
        }
    }

    onChange = (value) => {
        this.setState({invalid: value !== "" && !validation.isValidColor(value)});

        if (typeof this.props.onChange === "function") {
            this.props.onChange(value);
        }
    };

    render() {
        const colorButtons = this.colors.map((color) =>
            <span key={"button" + color} className="color-input" style={{"backgroundColor": color}}
                  onClick={() => {
                      if (typeof this.props.onChange === "function") {
                          this.props.onChange(color);
                      }
                      document.body.click(); // magic to close popup
                  }} />);

        const popover = (
            <Popover id="popover-basic">
                <Popover.Title as="h3">choose a color</Popover.Title>
                <Popover.Content>
                    <div className="colors-container">
                        <div className="colors-row">
                            {colorButtons.slice(0, 8)}
                        </div>
                        <div className="colors-row">
                            {colorButtons.slice(8, 18)}
                        </div>
                    </div>
                </Popover.Content>
            </Popover>
        );

        let buttonStyles = {};
        if (this.props.value) {
            buttonStyles["backgroundColor"] = this.props.value;
        }

        return (
            <div className="field color-field">
                <div className="color-input">
                    <InputField {...this.props} onChange={this.onChange} invalid={this.state.invalid} name="color"
                                error={null} />
                    <div className="color-picker">
                        <OverlayTrigger trigger="click" placement="top" overlay={popover} rootClose>
                            <button type="button" className="picker-button" style={buttonStyles}>pick</button>
                        </OverlayTrigger>
                    </div>
                </div>
                {this.props.error && <div className="color-error">{this.props.error}</div>}
            </div>
        );
    }

}

export default ColorField;
