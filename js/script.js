    const form = document.querySelector(".contact-form");

    form.addEventListener("submit", function (event) {
      event.preventDefault();

      alert(
        "Thank you for contacting Jael's Empire. We will get back to you shortly."
      );

      form.reset();
    });
