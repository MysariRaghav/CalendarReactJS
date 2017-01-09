package com.qpair.hospital;

import java.util.ArrayList;
import com.fasterxml.jackson.annotation.JsonIgnore;
import java.util.Arrays;
import java.util.Collection;
import java.util.List;
import lombok.Data;

import javax.persistence.Entity;
import javax.persistence.GeneratedValue;
import javax.persistence.Id;
import javax.persistence.Version;
import javax.transaction.Transactional;

import org.springframework.boot.CommandLineRunner;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.context.annotation.Bean;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.repository.query.Param;
import org.springframework.data.rest.core.annotation.RepositoryRestResource;


@SpringBootApplication
public class CalendarApplication {

	public static void main(String[] args) {
		SpringApplication.run(CalendarApplication.class, args);	
		}
		
		@Bean
		CommandLineRunner runner(AppointmentRepository appointmentRepository){
			
			return args -> {
				
				List<Appointment> appointments= new ArrayList<Appointment>();
				
				
				Appointment ap1= new Appointment("12/14/16", "12:00", "Emergency", "Simple Operation");

				Appointment ap2= new Appointment("12/14/16", "11:00", "Not Emergency", "Just Operation");
				Appointment ap3= new Appointment("12/15/16", "11:00", "Not Emergency", "Operation");

				appointments.add(ap1);
				appointments.add(ap2);
				appointments.add(ap3);
				
				appointments.forEach(appointment-> appointmentRepository.save(appointment));
				
				//appointmentRepository.
				
				//appointmentRepository.findAll().forEach(System.out::println);
				
				//appointmentRepository.findByDate("12/14/16").forEach(System.out::println);
				appointmentRepository.findByDateAndTime("12/14/16", "12:00").forEach(System.out::println);
				//appointmentRepository.findBySubject("Emergency").forEach(System.out::println);
				
				
			};
		}
	}


	/*@RestController
	class ReservationRestController{
		
		
		@RequestMapping("/reservations")
		Collection<Reservations> reservations(){
			return rr.findAll();
		}
		
		@Autowired
		private ReservationRepository rr;
		
	}*/


	@RepositoryRestResource
	interface AppointmentRepository extends JpaRepository<Appointment, Long>{
		
		Collection<Appointment> findByDate(@Param("date") String date);
		Collection<Appointment> findByDateAndTime(@Param("date") String date, @Param("time") String time);
		Collection<Appointment> findBySubject(@Param("subject") String subject);
		
		/*@Transactional
		Collection<Appointment> deleteById(@Param("id") long id);*/
		
	}

	
	@Data
	@Entity
	class Appointment{
		
		@Id
		@GeneratedValue
		private long id;
		
		private String date;
		private String time;
		private String subject;
		private String notes;

		private @Version @JsonIgnore Long version;
		
		public long getId() {
			return id;
		}

		
		
		
		@Override
		public String toString() {
			return "Appointments [ID=" + id + ", date=" + date + ", time=" + time + ", subject=" + subject + ", notes="
					+ notes + "]";
		}




		public String getDate() {
			return date;
		}




		public void setDate(String date) {
			this.date = date;
		}




		public String getTime() {
			return time;
		}




		public void setTime(String time) {
			this.time = time;
		}




		public String getSubject() {
			return subject;
		}




		public void setSubject(String subject) {
			this.subject = subject;
		}




		public String getNotes() {
			return notes;
		}




		public void setNotes(String notes) {
			this.notes = notes;
		}




		public Appointment(String date, String time, String subject, String notes) {
			super();
			this.date = date;
			this.time = time;
			this.subject = subject;
			this.notes = notes;
		}




		public Appointment() {
		
		}
		
		
		}
		
		
		


