'use strict';

const React = require('react');
const ReactDOM = require('react-dom')
const when = require('when');
const client = require('./client');

const follow = require('./follow'); // function to hop multiple links by "rel"

const root = '/api';

class App extends React.Component {

	constructor(props) {
		super(props);
		this.state = {appointments: [], attributes: [], pageSize: 2, links: {}};
		this.updatePageSize = this.updatePageSize.bind(this);
		this.onCreate = this.onCreate.bind(this);
		this.onUpdate = this.onUpdate.bind(this);
		this.onDelete = this.onDelete.bind(this);
		this.onNavigate = this.onNavigate.bind(this);
	}

	// tag::follow-2[]
	loadFromServer(pageSize) {
		follow(client, root, [
			{rel: 'appointments', params: {size: pageSize}}]
		).then(appointmentCollection => {
			return client({
				method: 'GET',
				path: appointmentCollection.entity._links.profile.href,
				headers: {'Accept': 'application/schema+json'}
			}).then(schema => {
				this.schema = schema.entity;
				this.links = appointmentCollection.entity._links;
				return appointmentCollection;
			});
		}).then(appointmentCollection => {
			return appointmentCollection.entity._embedded.appointments.map(appointment =>
					client({
						method: 'GET',
						path: appointment._links.self.href
					})
			);
		}).then(appointmentPromises => {
			return when.all(appointmentPromises);
		}).done(appointments => {
			this.setState({
				appointments: appointments,
				attributes: Object.keys(this.schema.properties),
				pageSize: pageSize,
				links: this.links
			});
		});
	}
	// end::follow-2[]

	// tag::create[]
	onCreate(newAppointment) {
		var self = this;
		follow(client, root, ['appointments']).then(response => {
			return client({
				method: 'POST',
				path: response.entity._links.self.href,
				entity: newAppointment,
				headers: {'Content-Type': 'application/json'}
			})
		}).then(response => {
			return follow(client, root, [{rel: 'appointments', params: {'size': self.state.pageSize}}]);
		}).done(response => {
			self.onNavigate(response.entity._links.last.href);
		});
	}
	// end::create[]

	// tag::update[]
	onUpdate(appointment, updatedAppointment) {
		client({
			method: 'PUT',
			path: appointment.entity._links.self.href,
			entity: updatedAppointment,
			headers: {
				'Content-Type': 'application/json',
				'If-Match': appointment.headers.Etag
			}
		}).done(response => {
			this.loadFromServer(this.state.pageSize);
		}, response => {
			if (response.status.code === 412) {
				alert('DENIED: Unable to update ' +
					appointment.entity._links.self.href + '. Your copy is stale.');
			}
		});
	}
	// end::update[]

	// tag::delete[]
	onDelete(appointment) {
		client({method: 'DELETE', path: appointment.entity._links.self.href}).done(response => {
			this.loadFromServer(this.state.pageSize);
		});
	}
	// end::delete[]

	// tag::navigate[]
	onNavigate(navUri) {
		client({
			method: 'GET',
			path: navUri
		}).then(appointmentCollection => {
			this.links = appointmentCollection.entity._links;

			return appointmentCollection.entity._embedded.appointments.map(appointment =>
					client({
						method: 'GET',
						path: appointment._links.self.href
					})
			);
		}).then(appointmentPromises => {
			return when.all(appointmentPromises);
		}).done(appointments => {
			this.setState({
				appointments: appointments,
				attributes: Object.keys(this.schema.properties),
				pageSize: this.state.pageSize,
				links: this.links
			});
		});
	}
	// end::navigate[]

	// tag::update-page-size[]
	updatePageSize(pageSize) {
		if (pageSize !== this.state.pageSize) {
			this.loadFromServer(pageSize);
		}
	}
	// end::update-page-size[]

	// tag::follow-1[]
	componentDidMount() {
		this.loadFromServer(this.state.pageSize);
	}
	// end::follow-1[]

	render() {
		return (
			<div>
				<CreateDialog attributes={this.state.attributes} onCreate={this.onCreate}/>
				<AppointmentList appointments={this.state.appointments}
							  links={this.state.links}
							  pageSize={this.state.pageSize}
							  attributes={this.state.attributes}
							  onNavigate={this.onNavigate}
							  onUpdate={this.onUpdate}
							  onDelete={this.onDelete}
							  updatePageSize={this.updatePageSize}/>
			</div>
		)
	}
}

// tag::create-dialog[]
class CreateDialog extends React.Component {

	constructor(props) {
		super(props);
		this.handleSubmit = this.handleSubmit.bind(this);
	}

	handleSubmit(e) {
		e.preventDefault();
		var newAppointment = {};
		this.props.attributes.forEach(attribute => {
			newAppointment[attribute] = ReactDOM.findDOMNode(this.refs[attribute]).value.trim();
		});
		this.props.onCreate(newAppointment);
		this.props.attributes.forEach(attribute => {
			ReactDOM.findDOMNode(this.refs[attribute]).value = ''; // clear out the dialog's inputs
		});
		window.location = "#";
	}

	render() {
		var inputs = this.props.attributes.map(attribute =>
			<p key={attribute}>
				<input type="text" placeholder={attribute} ref={attribute} className="field" />
			</p>
		);
		return (
			<div>
				<a href="#createAppointment">Create</a>

				<div id="createAppointment" className="modalDialog">
					<div>
						<a href="#" title="Close" className="close">X</a>

						<h2>Create new appointment</h2>

						<form>
							{inputs}
							<button onClick={this.handleSubmit}>Create</button>
						</form>
					</div>
				</div>
			</div>
		)
	}
};
// end::create-dialog[]

// tag::update-dialog[]
class UpdateDialog extends React.Component {

	constructor(props) {
		super(props);
		this.handleSubmit = this.handleSubmit.bind(this);
	}

	handleSubmit(e) {
		e.preventDefault();
		var updatedAppointment = {};
		this.props.attributes.forEach(attribute => {
			updatedAppointment[attribute] = ReactDOM.findDOMNode(this.refs[attribute]).value.trim();
		});
		this.props.onUpdate(this.props.appointment, updatedAppointment);
		window.location = "#";
	}

	render() {
		var inputs = this.props.attributes.map(attribute =>
				<p key={this.props.appointment.entity[attribute]}>
					<input type="text" placeholder={attribute}
						   defaultValue={this.props.appointment.entity[attribute]}
						   ref={attribute} className="field" />
				</p>
		);

		var dialogId = "updateAppointment-" + this.props.appointment.entity._links.self.href;

		return (
			<div key={this.props.appointment.entity._links.self.href}>
				<a href={"#" + dialogId}>Update</a>
				<div id={dialogId} className="modalDialog">
					<div>
						<a href="#" title="Close" className="close">X</a>

						<h2>Update an appointment</h2>

						<form>
							{inputs}
							<button onClick={this.handleSubmit}>Update</button>
						</form>
					</div>
				</div>
			</div>
		)
	}

};
// end::update-dialog[]


class AppointmentList extends React.Component {

	constructor(props) {
		super(props);
		this.handleNavFirst = this.handleNavFirst.bind(this);
		this.handleNavPrev = this.handleNavPrev.bind(this);
		this.handleNavNext = this.handleNavNext.bind(this);
		this.handleNavLast = this.handleNavLast.bind(this);
		this.handleInput = this.handleInput.bind(this);
	}

	// tag::handle-page-size-updates[]
	handleInput(e) {
		e.preventDefault();
		var pageSize = ReactDOM.findDOMNode(this.refs.pageSize).value;
		if (/^[0-9]+$/.test(pageSize)) {
			this.props.updatePageSize(pageSize);
		} else {
			ReactDOM.findDOMNode(this.refs.pageSize).value = pageSize.substring(0, pageSize.length - 1);
		}
	}
	// end::handle-page-size-updates[]

	// tag::handle-nav[]
	handleNavFirst(e){
		e.preventDefault();
		this.props.onNavigate(this.props.links.first.href);
	}
	handleNavPrev(e) {
		e.preventDefault();
		this.props.onNavigate(this.props.links.prev.href);
	}
	handleNavNext(e) {
		e.preventDefault();
		this.props.onNavigate(this.props.links.next.href);
	}
	handleNavLast(e) {
		e.preventDefault();
		this.props.onNavigate(this.props.links.last.href);
	}
	// end::handle-nav[]
	// tag::appointment-list-render[]
	render() {
		var appointments = this.props.appointments.map(appointment =>
				<Appointment key={appointment.entity._links.self.href}
						  appointment={appointment}
						  attributes={this.props.attributes}
						  onUpdate={this.props.onUpdate}
						  onDelete={this.props.onDelete}/>
		);

		var navLinks = [];
		if ("first" in this.props.links) {
			navLinks.push(<button key="first" onClick={this.handleNavFirst}>&lt;&lt;</button>);
		}
		if ("prev" in this.props.links) {
			navLinks.push(<button key="prev" onClick={this.handleNavPrev}>&lt;</button>);
		}
		if ("next" in this.props.links) {
			navLinks.push(<button key="next" onClick={this.handleNavNext}>&gt;</button>);
		}
		if ("last" in this.props.links) {
			navLinks.push(<button key="last" onClick={this.handleNavLast}>&gt;&gt;</button>);
		}

		return (
			<div>
				<input ref="pageSize" defaultValue={this.props.pageSize} onInput={this.handleInput}/>
				<table>
					<tbody>
						<tr>
							<th>Date</th>
							<th>Time</th>
							<th>Subject</th>
							<th>Notes</th>
							<th></th>
							<th></th>
						</tr>
						{appointments}
					</tbody>
				</table>
				<div>
					{navLinks}
				</div>
			</div>
		)
	}
	// end::appointment-list-render[]
}

// tag::appointment[]
class Appointment extends React.Component {

	constructor(props) {
		super(props);
		this.handleDelete = this.handleDelete.bind(this);
	}

	handleDelete() {
		this.props.onDelete(this.props.appointment);
	}

	render() {
		return (
			<tr>
				<td>{this.props.appointment.entity.date}</td>
				<td>{this.props.appointment.entity.time}</td>
				<td>{this.props.appointment.entity.subject}</td>
				<td>{this.props.appointment.entity.notes}</td>
				<td>
					<UpdateDialog appointment={this.props.appointment}
								  attributes={this.props.attributes}
								  onUpdate={this.props.onUpdate}/>
				</td>
				<td>
					<button onClick={this.handleDelete}>Delete</button>
				</td>
			</tr>
		)
	}
}
// end::appointment[]

ReactDOM.render(
	<App />,
	document.getElementById('react')
)